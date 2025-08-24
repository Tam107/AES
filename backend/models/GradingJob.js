import { connectToDb } from '../config/mongodb.js';

export async function getGradingJobCollection(){
    const db = await connectToDb()
    if (!db) {
        throw new Error("Failed to connect to the database.");
        console.log("Failed to connect to the database.");
    }
    return db.collection('gradingJobs');
}