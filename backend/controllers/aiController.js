import dotenv from "dotenv";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Document from "../models/old/Document.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import axiosRetry from "axios-retry";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.OPEN_API_KEY_3;
const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1";

async function getOpenAIClient() {
    return new OpenAI({ baseURL: endpoint, apiKey: token });
}

function getGoogleModel() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    return genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { temperature: 0.5 },
        systemInstruction: {
            role: "system",
            parts: [
                {
                    text: "You are a helpful assistant who generates IELTS Writing Task 2 questions based on real-life past exam topics.",
                },
            ],
        },
    });
}

export const evaluateEssay = async (req, res) => {
    try {
        const client = await getOpenAIClient();

        const response = await client.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content:
                        "You are an IELTS Writing Task 2 examiner. Please evaluate the essay based on the following four criteria: Task Response, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy. Return each score separately along with a brief evaluation for each criterion.",
                },
                {
                    role: "user",
                    content: `
Scoring this IELTS writing with the result as this format below:
first you need write the full title of this IELTS writing 
second scoring this IELTS writing as the IELTS 4 principles 
after that give me the total score and suggestion for improvement for each principle then give me the suggested sample based on the provided writing 

Title: ${req.body.title}
Essay: ${req.body.content}

Give me the result ONLY in valid JSON format (no markdown, no explanation). Format:
{
  "full_title": "",
  "total_score": "",
  "Task_Response": { "score": "", "comment": "" },
  "Coherence_and_Cohesion": { "score": "", "comment": "" },
  "Lexical_Resource": { "score": "", "comment": "" },
  "Grammatical_Range_and_Accuracy": { "score": "", "comment": "" },
  "Suggestions_Improvement": {
    "Task_Response": "",
    "Coherence_and_Cohesion": "",
    "Lexical_Resource": "",
    "Grammatical_Range_and_Accuracy": ""
  },
  "Feedback": "",
  "Band_9_Sample": ""
}
(check nếu title hoặc content không có nghĩa thì chỉ trả ra 1 object json chứa {"success": false})
                    `,
                },
            ],
            temperature: 0.5,
            top_p: 1,
            model,
            n: 1,
            presence_penalty: 0.5,
            frequency_penalty: 0.5,
            response_format: { type: "json_object" },
        });

        let parsed;
        try {
            parsed = JSON.parse(response.choices[0].message.content);
        } catch (e) {
            return res
                .status(200)
                .json({ success: false, error: "Invalid JSON returned by model" });
        }

        const doc = new Document({
            title: req.body.title,
            content: req.body.content,
            path: parsed,
            ownerId: req.body._id,
        });
        await doc.save();

        return res.json({ success: true, path: parsed, doc });
    } catch (error) {
        if (error.code === "RateLimitReached") {
            return res.status(429).json({
                success: false,
                error: "Rate limit exceeded, please retry later.",
            });
        }
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};

// ---------------- Controllers ----------------
export const getRandomTitle = async (req, res) => {
    try {
        const client = await getOpenAIClient();

        const response = await client.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content:
                        "You are a helpful assistant who generates IELTS Writing Task 2 questions based on real-life past exam topics.",
                },
                {
                    role: "user",
                    content:
                        "Create a random IELTS Writing Task 2 question. The question should based on topics commonly found in real IELTS exams.",
                },
            ],
            temperature: 0.5,
            top_p: 1,
            model,
            n: 1,
            presence_penalty: 0.5,
            frequency_penalty: 0.5,
        });

        return res.json({
            success: true,
            data: response.choices[0].message.content,
        });
    } catch (error) {
        const modelGoogle = getGoogleModel();
        const result = await modelGoogle.generateContent(
            "Create a random IELTS Writing Task 2 question that is popular in 2025. The question should based on topics commonly found in real IELTS exams."
        );

        return res.status(200).json({
            success: true,
            data: result.response.candidates[0].content.parts[0].text,
        });
    }
};

export const getTitleOnTopic = async (req, res) => {
    try {
        const client = await getOpenAIClient();
        const topic = req.body.topic;

        if (!topic) {
            return res.status(200).json({ error: "Topic is required", success: false });
        }

        const response = await client.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content:
                        "You are a helpful assistant who generates IELTS Writing Task 2 questions based on real-life past exam topics.",
                },
                {
                    role: "user",
                    content: `Create a random IELTS Writing Task 2 question based on the topic: ${topic}. The question should be relevant to topics commonly found in real IELTS exams.`,
                },
            ],
            temperature: 0.5,
            top_p: 1,
            model,
            n: 1,
            presence_penalty: 0.5,
            frequency_penalty: 0.5,
        });

        return res.json({
            success: true,
            data: response.choices[0].message.content,
        });
    } catch (error) {
        const modelGoogle = getGoogleModel();
        const prompt = `Create a random IELTS Writing Task 2 question based on the topic: ${req.body.topic}. The question should be relevant to topics commonly found in real IELTS exams.`;

        const result = await modelGoogle.generateContent(prompt);
        return res.status(200).json({
            success: true,
            data: result.response.candidates[0].content.parts[0].text,
        });
    }
};



export const testAI = async (req, res) => {
    try {
        const client = await getOpenAIClient();
        await client.chat.completions.create({
            messages: [
                { role: "system", content: "" },
                { role: "user", content: "What is the capital of France?" },
            ],
            temperature: 1,
            top_p: 1,
            model,
        });

        return res.json({ success: true });
    } catch (error) {
        return res.json({ success: false });
    }
};

export const saveLearningData = async (req, res) => {
    try {
        const dataFolderPath = path.resolve(__dirname, "../data");
        const filePath = path.join(dataFolderPath, "data.json");

        if (!fs.existsSync(dataFolderPath)) fs.mkdirSync(dataFolderPath);

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify([req.body], null, 2));
        } else {
            const fileContent = fs.readFileSync(filePath, "utf-8");
            const parsedData = JSON.parse(fileContent);
            parsedData.push(req.body);
            fs.writeFileSync(filePath, JSON.stringify(parsedData, null, 2));
        }

        await Document.updateOne({ _id: req.params.id }, { isAIAcess: true });

        return res.status(200).json({
            success: true,
            message: "Data has been added successfully",
        });
    } catch (error) {
        return res.status(200).json({ success: false });
    }
};

const OPENAI_KEY = process.env.OPENAI_KEY; // Hoặc "gpt-4o" nếu tài khoản của bạn hỗ trợ

// const newModel = "gpt-4o-mini";
const newModel = "gpt-4.1-mini";

// Tạo một instance của axios client để cấu hình chung
// const aiApiClient = axios.create({
//     baseURL: "https://api.openai.com/v1", // Địa chỉ "ngôi nhà" OpenAI
//     headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${OPENAI_KEY}`,
//     },
// });
//
// // Cấu hình tự động thử lại (retry)
// axiosRetry(aiApiClient, {
//     retries: 3,
//     retryDelay: axiosRetry.exponentialDelay,
//     retryCondition: (error) => {
//         return (
//             axiosRetry.isNetworkOrIdempotentRequestError(error) ||
//             (error.response && error.response.status >= 500)
//         );
//     },
// });

/**
 * Gửi prompt đến OpenAI API để nhận review.
 * @param {string} prompt - Prompt chi tiết cho AI.
 * @returns {Promise<string>} - Nội dung review từ AI.
 */
// export const getAiReview = async (prompt) => {
//     try {
//         console.log(`Sending request to OpenAI with model: ${newModel}`);
//
//         // FIX 1: Endpoint phải là '/chat/completions' để chỉ định đúng "căn phòng"
//         const response = await aiApiClient.post('/chat/completions', {
//             model: newModel,
//             messages: [{
//                 role: "user",
//                 content: prompt,
//             }],
//             max_tokens: 1500,
//             temperature: 0.5,
//         });
//
//         // FIX 3: Phải truy cập vào choices[0] vì OpenAI luôn trả về một mảng
//         const reviewContent = response.data.choices[0].message.content;
//
//         if (!reviewContent) {
//             throw new Error("AI response content is empty.");
//         }
//
//         return reviewContent.trim();
//
//     } catch (error) {
//         if (error.response) {
//             console.error('AI API Error:', error.response.status, error.response.data);
//         } else {
//             console.error('Error in getAiReview:', error.message);
//         }
//         throw new Error('Failed to get review from AI service after retries.');
//     }
// };

const GEMINI_MODEL = "gemini-1.5-flash-latest";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// API của Gemini yêu cầu key nằm trong URL
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Tạo một instance của axios client. Không cần header Authorization nữa.
const aiApiClient = axios.create({
    headers: {
        "Content-Type": "application/json",
    },
});

// Cấu hình tự động thử lại (retry) vẫn giữ nguyên, rất hữu ích
axiosRetry(aiApiClient, {
    retries: 8,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
        return (
            axiosRetry.isNetworkOrIdempotentRequestError(error) ||
            (error.response && error.response.status >= 500)
        );
    },
});

/**
 * Gửi prompt đến Google Gemini API để nhận review.
 * @param {string} prompt - Prompt chi tiết cho AI.
 * @returns {Promise<string>} - Nội dung review từ AI.
 */
export const getAiReview = async (prompt) => {
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set in the .env file.");
    }

    // Cấu trúc body của request cho Gemini khác hoàn toàn so với OpenAI
    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        // Thêm các cấu hình an toàn và sinh nội dung
        generationConfig: {
            temperature: 0.5,
            topP: 1,
            topK: 1,
            maxOutputTokens: 2048,
        },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ]
    };

    try {
        console.log(`Sending request to Gemini with model: ${GEMINI_MODEL}`);

        const response = await aiApiClient.post(API_URL, requestBody);

        // Cách lấy kết quả từ response của Gemini cũng khác
        if (response.data.candidates && response.data.candidates.length > 0) {
            const reviewContent = response.data.candidates[0].content.parts[0].text;
            return reviewContent.trim();
        } else {
            // Trường hợp AI không trả về kết quả (có thể do bộ lọc an toàn)
            console.warn("AI response was blocked or empty:", response.data);
            throw new Error("AI response was blocked or did not contain any content.");
        }

    } catch (error) {
        if (error.response) {
            console.error('AI API Error:', error.response.status, error.response.data);
        } else {
            console.error('Error in getAiReview:', error.message);
        }
        throw new Error('Failed to get review from AI service after retries.');
    }
};