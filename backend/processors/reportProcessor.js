import ExcelJS from 'exceljs';
import path from 'path';
import { getGradingJobCollection } from '../models/GradingJob.js';

const resultsDir = path.join(process.cwd(), 'results');

export const reportGenerator = async (job) => {
    const { jobId } = job.data;
    console.log(` Generating report for job ${jobId}`);

    try {
        const collection = await getGradingJobCollection();
        const parentJob = await collection.findOne({ _id: jobId });

        if (!parentJob) {
            throw new Error(`Job ${jobId} not found for report generation.`);
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Kết quả chấm bài');

        worksheet.columns = [
            { header: 'Time', key: 'time', width: 20 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Student ID', key: 'studentId', width: 15 },
            { header: 'Class', key: 'class', width: 15 },
            { header: 'Order', key: 'order', width: 10 },
            { header: 'Question', key: 'question', width: 50 },
            { header: 'Answer', key: 'answer', width: 50 },
            { header: 'Review', key: 'review', width: 50 },
        ];

        parentJob.submissions.forEach(sub => {
            worksheet.addRow({
                time: sub.time,
                email: sub.email,
                name: sub.name,
                studentId: sub.studentId,
                class: sub.class,
                order: sub.order,
                question: sub.question,
                answer: sub.answer,
                review: sub.review || 'Chưa có kết quả',
            });
        });

        // Wrap text for review column
        worksheet.getColumn('review').alignment = { wrapText: true, vertical: 'top' };
        worksheet.getColumn('answer').alignment = { wrapText: true, vertical: 'top' };


        const outputFilePath = path.join(resultsDir, `results-${jobId}.xlsx`);
        await workbook.xlsx.writeFile(outputFilePath);

        await collection.updateOne({ _id: jobId }, { $set: { status: 'report_generated', reportPath: outputFilePath } });

        console.log(` Report generated successfully: ${outputFilePath}`);
    } catch (error) {
        console.error(` Failed to generate report for job ${jobId}:`, error);
        throw error;
    }
};