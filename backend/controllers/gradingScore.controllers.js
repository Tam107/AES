import Exceljs from "exceljs";
import dotenv from "dotenv";

dotenv.config();
import {OpenAI} from "openai";
import pLimit from 'p-limit';
import {GoogleGenAI} from "@google/genai";
import {GoogleGenerativeAI} from "@google/generative-ai";
import fs from "fs";


// const GEMINI_MODEL = "gemini-1.5-flash-latest";
const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// API của Gemini yêu cầu key nằm trong URL
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

function cleanResponse(raw) {
    // Xoá các backtick ```json ... ```
    let cleaned = raw.replace(/```json|```/g, "").trim()
    return cleaned
}

async function callApi(data) {
    const model = genAI.getGenerativeModel({model: GEMINI_MODEL})

    const prompt = `
            Bạn là một giáo viên có chuyên môn về viết văn bản tiếng Việt. Bạn đang chấm điểm các bài luận về chủ đề thiên tai, mỗi bài luận có ba đoạn văn được viết theo các phong cách khác nhau như sau:
                + Phong cách hành chính - công vụ: trang trọng, chặt chẽ, quy phạm.
                + Phong cách báo chí - công luận: ngắn gọn, thời sự, hướng công chúng.
                + Phong cách chính luận: lập luận, thuyết phục, nêu quan điểm.
                + Phong cách khoa học: khúc chiết, login, dùng khái niệm chính xác.
                + Phong cách nghệ thuật: giàu hình ảnh, cảm xúc, sáng tạo.
              
            ---
            **Câu hỏi (đề bài):**
            ${data.question}
            ---
            **Bài làm của sinh viên:**
            ${data.students.map(student => `
            ID: ${student.id} - ${student.name}
            ${student.answer}`).join("\n\n")}
            ---
            YÊU CẦU:
            Hãy nhận xét các tiêu chí và chấm điểm bài luận theo các tiêu chí dưới đây bằng tiếng việt thật chi tiết. Bài luận có ba đoạn văn, cần được đánh giá theo rubric sau và phản hồi theo đúng format:
            1. Nội dung (3 điểm):
              +3đ: Bám sát đề tài, ý tưởng rõ ràng và đa dạng
              +2đ: Bám sát nhưng ý trùng lặp, dẫn chứng hạn chế
              +1đ: Ý mờ nhạt, có đoạn lạc đề
              +0đ: Sai đề
            2. Phong cách (4 điểm):
              +4đ: 3 đoạn văn thể hiện rõ ràng 3 phong cách khác nhau
              +3đ: Có 2 đoạn rõ ràng, 1 đoạn chưa thể hiện rõ
              +2đ: Cả ba đoạn chưa rõ phong cách
              +0–1đ: Các đoạn gần như giống nhau
            3. Hình thức (2 điểm):
              +2đ: Bố cục rõ, câu trôi chảy, ít lỗi
              +1đ: Bố cục chưa rõ, còn lỗi ngữ pháp/chính tả
              +0đ: Sai nhiều, khó đọc
            4. Sáng tạo (1 điểm):
              +1đ: Có ý tưởng mới, ví dụ sinh động
              +0đ: Thiếu sáng tạo
            ---
            ĐỊNH DẠNG KẾT QUẢ:
            Chỉ trả về kết quả đúng theo cấu trúc sau, KHÔNG thêm lời dẫn hay giải thích khác.
            Hãy cho tôi kết quả theo định dạng như sau:
            {
                "students": [
                    {
                        "id": 1,
                        "name": "Nguyễn Văn A",
                        "review": {
                            "Nội dung": {
                                "Nhận xét": "...",
                                "Điểm": "x/3"
                            },
                            "Phong cách": {
                                "Nhận xét": "...",
                                "Điểm": "x/4"
                            },
                            "Hình thức": {
                                "Nhận xét": "...",
                                "Điểm": "x/2"
                            },
                            "Sáng tạo": {
                                "Nhận xét": "...",
                                "Điểm": "x/1"
                            },
                            "Tổng điểm": {
                                "Điểm": "x/10",
                            },
                            "Nhận xét chung": "..."
                        }
                    },
                    {
                        "id": 2,
                        "name": "Nguyễn Văn B",
                        "review": {
                            ...
                        }
                    }
                ]
            }
            `;
    try {
        const result = await model.generateContent(prompt)
        const response = await result.response
        const raw = response.text()

        // 1. Làm sạch chuỗi JSON
        const cleaned = cleanResponse(raw)

        // 2. Parse sang object
        const parsed = JSON.parse(cleaned)

        // 3. Lấy danh sách students
        const students = parsed.students

        console.log(students)
        return students
    } catch (error) {
        console.log(error)
        throw new Error("Error in processing Gemini API")
    }
}

export const gradingScore = async (req, res) => {
    if (!req.file) {
        return res.status(400).send("Không có file nào được tải lên.");
    }

    const workbook = new Exceljs.Workbook();
    const filePath = req.file.path;

    try {
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.worksheets[0];
        const rows = [];
        worksheet.eachRow((row) => {
            rows.push(row.values);
        });

        const resAPI = await callApi({
            question: rows[0][7],
            students: rows.slice(1).map(row => ({
                id: row[5], // Cột 5 (E)
                name: row[3], // Cột 3 (C)
                answer: row[7] // Cột 7 (H)
            }))
        });


        fs.unlink(filePath, (err) => {
            if (err) {
                console.error("Không thể xóa file:", err);
            } else {
                console.log("File đã được xóa thành công");
            }
        });


        res.json({
            question: rows[0][7],
            results: resAPI
        });

    } catch (error) {
        console.error("Lỗi xử lý file hoặc gọi API:", error);
        res.status(500).send("Lỗi trong quá trình xử lý yêu cầu.");
    }
};




// import Exceljs from "exceljs";
// import dotenv from "dotenv";
// import OpenAI from "openai";
// import pLimit from "p-limit";

// dotenv.config();

// // API Key của OpenAI
// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
// });

// // Model GPT (có thể đổi thành gpt-4o-mini, gpt-4o,...)
// const GPT_MODEL = "gpt-4o-mini";

// function cleanResponse(raw) {
//     // Xoá các backtick ```json ... ```
//     let cleaned = raw.replace(/```json|```/g, "").trim();
//     return cleaned;
// }

// async function callApi(data) {
//     const prompt = `
//     Bạn là một giáo viên có chuyên môn về viết văn bản tiếng Việt. Bạn đang chấm điểm một bài luận với đề tài sau:        
//     ---
//     **Câu hỏi (đề bài):**
//     ${data.question}           
//     ---
//     **Bài làm của sinh viên:**
//     ${data.students
//         .map(
//             (student) => `
//     ID: ${student.id} - ${student.name}
//     ${student.answer}`
//         )
//         .join("\n\n")}
//     ---
//     YÊU CẦU:
//     Hãy nhận xét các tiêu chí và chấm điểm bài luận theo các tiêu chí dưới đây bằng tiếng việt thật chi tiết. Bài luận có ba đoạn văn, cần được đánh giá theo rubric sau và phản hồi theo đúng format:      
//     1. Nội dung (3 điểm) ...
//     2. Phong cách (4 điểm) ...
//     3. Hình thức (2 điểm) ...
//     4. Sáng tạo (1 điểm) ...
//     ---
//     ĐỊNH DẠNG KẾT QUẢ:
//     Chỉ trả về JSON theo đúng cấu trúc:
//     {
//         "students": [
//             {
//                 "id": 1,
//                 "name": "Nguyễn Văn A",
//                 "review": {
                        //     "Nội dung": {
                        //         "Nhận xét": "...",
                        //         "Điểm": "x/3"
                        //     },
                        //     "Phong cách": {
                        //         "Nhận xét": "...",
                        //         "Điểm": "x/4"
                        //     },
                        //     "Hình thức": {
                        //         "Nhận xét": "...",
                        //         "Điểm": "x/2"
                        //     },
                        //     "Sáng tạo": {
                        //         "Nhận xét": "...",
                        //         "Điểm": "x/1"
                        //     },
                        //     "Tổng điểm": {
                        //         "Điểm": "x/10",
                        //         "Xếp loại": "(Giỏi/Khá/Trung bình/Yếu)"
                        //     }
                        // }
//             }
//         ]
//     }
//   `;

//     try {
//         const response = await openai.chat.completions.create({
//             model: GPT_MODEL,
//             messages: [{ role: "user", content: prompt }],
//             temperature: 0.2,
//         });

//         const raw = response.choices[0].message.content;
//         const cleaned = cleanResponse(raw);
//         const parsed = JSON.parse(cleaned);
//         const students = parsed.students;

//         console.log(students);
//         return students;
//     } catch (error) {
//         console.error(error);
//         throw new Error("Error in processing GPT API");
//     }
// }

// export const gradingScore = async (req, res) => {
//     if (!req.file) {
//         return res.status(400).send("Không có file nào được tải lên.");
//     }

//     const workbook = new Exceljs.Workbook();
//     const filePath = req.file.path;

//     try {
//         await workbook.xlsx.readFile(filePath);
//         const worksheet = workbook.worksheets[0];
//         const rows = [];
//         worksheet.eachRow((row) => {
//             rows.push(row.values);
//         });

//         const resAPI = await callApi({
//             question: rows[0][7],
//             students: rows.slice(1).map((row) => ({
//                 id: row[5], // Cột 5 (E)
//                 name: row[3], // Cột 3 (C)
//                 answer: row[7], // Cột 7 (H)
//             })),
//         });

//         res.json({
//             question: rows[0][7],
//             results: resAPI,
//         });
//     } catch (error) {
//         console.error("Lỗi xử lý file hoặc gọi API:", error);
//         res.status(500).send("Lỗi trong quá trình xử lý yêu cầu.");
//     }
// };
