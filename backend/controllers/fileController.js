import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { getGradingJobCollection } from "../models/GradingJob.js";
import { fileProcessingQueue, reportGenerationQueue } from "../queue/gradingQueue.js";

export const uploadFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }
    try {
        const jobId = uuidv4();
        await fileProcessingQueue.add("process-file", {
            filePath: req.file.path,
            originalName: req.file.originalname,
            jobId: jobId,
        });
        res.status(202).json({
            message: "File uploaded. Processing has started.",
            jobId: jobId,
        });
    } catch (error) {
        console.error("Error adding job to queue:", error);
        res.status(500).send("Failed to start processing job.");
    }
};

export const getJobStatus = async (req, res) => {
    const { jobId } = req.params;
    try {
        const collection = await getGradingJobCollection();
        const job = await collection.findOne({ _id: jobId });

        if (!job) {
            return res.status(404).json({ status: "not_found", jobId });
        }

        if (
            job.processedSubmissions === job.totalSubmissions &&
            job.status !== "report_generated"
        ) {
            job.status = "completed";
        }

        res.json({
            jobId: job._id,
            status: job.status,
            progress: `${job.processedSubmissions} / ${job.totalSubmissions}`,
        });
    } catch (error) {
        console.error("Error fetching job status:", error);
        res.status(500).send("Failed to get job status.");
    }
};

export const downloadReport = async (req, res) => {
    const { jobId } = req.params;
    try {
        const collection = await getGradingJobCollection();
        const job = await collection.findOne({ _id: jobId });

        if (!job) {
            return res.status(404).send("Job not found.");
        }

        if (job.reportPath && fs.existsSync(job.reportPath)) {
            return res.download(job.reportPath);
        }

        if (job.processedSubmissions !== job.totalSubmissions) {
            return res.status(400).send("Grading is not yet complete.");
        }

        await reportGenerationQueue.add("generate-report", { jobId });
        res
            .status(202)
            .send("Report generation has started. Please check back in a moment.");
    } catch (error) {
        console.error("Error during download request:", error);
        res.status(500).send("Failed to process download request.");
    }
};
