import {Queue} from "bullmq";
import {redisConnection} from "../config/redis.js";

export const FILE_PROCESSING_QUEUE = "file-processing-queue";
export const GRADING_QUEUE = "grading-queue";
export const REPORT_GENERATION_QUEUE = "report-generation-queue";

export const fileProcessingQueue = new Queue(FILE_PROCESSING_QUEUE, {connection: redisConnection});
export const gradingQueue = new Queue(GRADING_QUEUE, {connection: redisConnection});
export const reportGenerationQueue = new Queue(REPORT_GENERATION_QUEUE, {connection: redisConnection});
