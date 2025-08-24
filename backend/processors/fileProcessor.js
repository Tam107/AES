import Exceljs from "exceljs";
import fs from "fs";
import {gradingQueue} from "../queue/gradingQueue.js";
import {getGradingJobCollection} from "../models/GradingJob.js";

export const fileProcessor = async (job) => {
    const {filePath, originalName, jobId} = job.data;
    console.log(`[FileProcessor] Processing file: ${filePath} for job ID: ${jobId}`);

    try {
        const collection = await getGradingJobCollection();
        const workbook = new Exceljs.Workbook();
        await workbook.xlsx.readFile(filePath)

        const worksheet = workbook.worksheets[0];
        const studentSubmissions = []
        let question = ''
        worksheet.eachRow({inclueEmpty: false}, (row, rowNumber) => {
            studentSubmissions.push({
                rowNumber,
                name: row.getCell('C').value,
                studentId: row.getCell('D').value,
                answer: row.getCell('G').value,
                review: null,
                status: 'pending'
            })
            console.log("Cell values: C, D, G", row.getCell('C').value, row.getCell('D').value, row.getCell('G').value);
        })

        await collection.insertOne({
            _id: jobId,
            originalName,
            question,
            status: 'processing',
            totalSubmissions: studentSubmissions.length,
            processedSubmissions: 0,
            submissions: studentSubmissions,
            createdAt: new Date(),
        })

        const jobs = studentSubmissions.map(submission => ({
            name: 'grade-submission',
            data: {parentJobId: jobId, studentRow: submission.rowNumber},
            opts: {
                attempts: 3,
                backoff: {type: 'exponential', delay: 5000},
            },
        }));

        await gradingQueue.addBulk(jobs);
        console.log(`[FileProcessor] Added ${jobs.length} grading jobs for parent job ${jobId}`);

    } catch (error) {
        console.log(`[FileProcessor] Error processing file ${filePath}:`, error);
        throw new Error('Failed to get review from AI service.');
    } finally {
        {
            fs.unlinkSync(filePath)
        }
    }

}