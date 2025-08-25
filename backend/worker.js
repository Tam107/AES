// khoi chay cac background worker
import { Worker } from 'bullmq';
import 'dotenv/config';
import { redisConnection } from './config/redis.js';
import { FILE_PROCESSING_QUEUE, GRADING_QUEUE, REPORT_GENERATION_QUEUE } from './queue/gradingQueue.js';

import { fileProcessor } from './processors/fileProcessor.js';
import { gradingProcessor } from './processors/gradingProcessor.js';
import { reportGenerator } from './processors/reportProcessor.js';

console.log('Worker process started...');

new Worker(FILE_PROCESSING_QUEUE, fileProcessor, {
    connection: redisConnection,
    concurrency: 5,
});

new Worker(GRADING_QUEUE, gradingProcessor, {
    connection: redisConnection,
    concurrency: 12,
    limiter: {
        max: 12, // Giới hạn 20 jobs mỗi phút để tránh rate limit của AI
        duration: 60000,
    },
});

new Worker(REPORT_GENERATION_QUEUE, reportGenerator, {
    connection: redisConnection,
    concurrency: 2,
});

console.log('Workers are listening for jobs...');