import { MongoClient } from 'mongodb';
import 'dotenv/config';

// Lấy chuỗi kết nối từ file.env. Lưu ý tên biến là MONGO_URI
const uri = process.env.MONGO;
if (!uri) {
    throw new Error('MONGO_URI is not defined in the.env file');
}

const client = new MongoClient(uri);
let db;

// Hàm này sẽ kết nối tới DB và tái sử dụng kết nối nếu đã tồn tại
export async function connectToDb() {
    if (db) {
        return db;
    }
    try {
        await client.connect();
        console.log('Connected successfully to MongoDB');
        // Lấy tên DB từ chuỗi URI hoặc chỉ định một tên mặc định
        db = client.db();
        return db;
    } catch (e) {
        console.error('Could not connect to MongoDB', e);
        // Thoát khỏi tiến trình nếu không thể kết nối DB
        process.exit(1);
    }
}