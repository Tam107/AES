import Exceljs from "exceljs";
import { getAiReview } from "./aiController.js";
import dotenv from "dotenv";
dotenv.config();
import { OpenAI } from "openai";
import pLimit from 'p-limit';

async function getOpenAIClient() {
    return new OpenAI({  baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.AES_API_ROUTER_KEY });
}
async function callApi(data){
    const prompt = `
            Bạn là một giáo viên có chuyên môn về viết văn bản tiếng Việt. Bạn đang chấm điểm một bài luận với đề tài sau:        
            ---
            **Câu hỏi (đề bài):**
            ${data.question}           
            ---
            **Bài làm của sinh viên:**
            ${data.students.map(student => `
            ID: ${student.id} - ${student.name}
            ${student.answer}`).join("\n\n")}
            ---
            **YÊU CẦU:**
            Hãy nhận xét và chấm điểm bài luận theo các tiêu chí dưới đây bằng tiếng việt. Bài luận có ba đoạn văn, cần được đánh giá theo rubric sau và phản hồi theo đúng format:      
            1. Nội dung (3 điểm):
              +3đ: Bám sát đề tài, ý tưởng rõ ràng và đa dạng
              +2đ: Bám sát đề nhưng ý trùng lặp, dẫn chứng hạn chế
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
            **ĐỊNH DẠNG KẾT QUẢ:**
            Chỉ trả về kết quả đúng theo cấu trúc sau, KHÔNG thêm lời dẫn hay giải thích khác:
            1. Nội dung: [Nhận xét chi tiết về nội dung].
            Điểm: [0–3]/3
            2. Phong cách: [Nhận xét chi tiết về phong cách].
            Điểm: [0–4]/4
            3. Hình thức: [Nhận xét chi tiết về hình thức].
            Điểm: [0–2]/2
            4. Sáng tạo: [Nhận xét chi tiết về sáng tạo].
            Điểm: [0–1]/1
            Tổng điểm: [Tổng]/10 ([Xếp loại])

            **Hãy cho tôi kết quả theo định dạng JSON như sau:**
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
                                "Xếp loại": "(Giỏi/Khá/Trung bình/Yếu)"
                            }
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
    //  const review = await getAiReview(prompt);

    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
        messages: [
            { role: "system", content: "Bạn là một giáo viên đang chấm bài cho các học sinh" },
            { role: "user", content: prompt }
        ],
        model: "deepseek/deepseek-chat-v3-0324:free",
    });

    
      return response;
    // return prompt;
}



export const gradingScore = async (req, res) => {
    let subjectCode = [
        {
            code: 1,
            name: "Bài tập Hà Nội học",
        },
        {
            code: 2,
            name: "Bài tập Lịch sử văn minh thế giới 1",
        },
        {
            code: 3,
            name: "Bài tập Lịch sử văn minh thế giới 2",
        },
    ];

    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    const workbook = new Exceljs.Workbook();
    const filePath = req.file.path;

    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];

    // console.log("Sheet Name:", worksheet.name);

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
        // console.log(`Row ${rowNumber}:`, row.values);
        rows.push(row.values); 
    });
    function chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    const studentChunks = chunkArray(rows.slice(1), 5);
    const limit = pLimit(5);

    const promises = studentChunks.map(chunk => {
        let newData = {
            question: rows[0][7], // Câu hỏi từ dòng đầu tiên
            students: chunk.map(row => ({
                id: row[5],        
                name: row[3],      
                answer: row[7]    
            }))
        };
        return limit(() => callApi(newData));
    });
    
    try {
        const resAPI = await Promise.all(promises);
        res.json({
            sheetName: worksheet.name,
            rows: rows,
            resAPI
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error while processing API requests.");
    }
};
