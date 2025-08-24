import {getAiReview} from "../controllers/aiController.js";
import {getGradingJobCollection} from "../models/GradingJob.js";

export const gradingProcessor = async (job) => {
    const {parentJobId, studentRow} = job.data;
    try {
        const collection = await getGradingJobCollection()
        const parentJob = await collection.findOne({_id: parentJobId});

        if (!parentJob) {
            console.log(`[GradingProcessor] Parent job ${parentJobId} not found.`);
            throw new Error('Failed to get review from AI service parent job.');
        }
        const submission = parentJob.submissions.find((submission) => submission.rowNumber === studentRow);
        if (!submission) {
            console.log(`[GradingProcessor] Submission for row ${studentRow} not found in parent job ${parentJobId}.`);
            throw new Error('Failed to get review from AI service submission.');
        }

        const prompt = `
            Bạn là một giáo viên có chuyên môn về viết văn bản tiếng Việt. Bạn đang chấm điểm một bài luận với đề tài sau:
            
            ---
            **Câu hỏi (đề bài):**
            ${parentJob.question}
            
            ---
            **Bài làm của sinh viên:**
            ${submission.answer}
            
            ---
            **YÊU CẦU:**
            Hãy nhận xét và chấm điểm bài luận theo các tiêu chí dưới đây. Bài luận có ba đoạn văn, cần được đánh giá theo rubric sau:
            
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
            `;


        const review = await getAiReview(prompt);

        const result = await collection.updateOne(
            {_id: parentJobId, "submissions.rowNumber": studentRow},
            {
                $set: {
                    "submissions.$.review": review,
                    "submissions.$.status": 'completed',
                },
                $inc: {processedSubmissions: 1},
            }
        );

        if (result.modifiedCount === 0) {
            throw new Error('Failed to update submission in DB');
        }

        console.log(`[GradingProcessor] Successfully graded submission for job ${parentJobId}, row ${studentRow}`);

    } catch (error) {
        console.error(`[GradingProcessor] Failed to grade submission for job ${parentJobId}, row ${studentRow}:`, error);
        throw error;
    }
};