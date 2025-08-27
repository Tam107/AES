// import express from "express";
// import multer from "multer";
// import path from "path";
// import fs from "fs";
// import {
//     uploadFile,
//     getJobStatus,
//     downloadReport,
// } from "../controllers/fileController.js";

// const router = express.Router();

// // đảm bảo thư mục uploads tồn tại
// const uploadsDir = path.join(process.cwd(), "uploads");
// if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => cb(null, uploadsDir),
//     filename: (req, file, cb) => {
//         const uniqueSuffix =
//             Date.now() + "-" + Math.round(Math.random() * 1e9);
//         cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
//     },
// });
// const upload = multer({ storage: storage });

// // định nghĩa route
// router.post("/upload", upload.single("submissions"), uploadFile);
// router.get("/status/:jobId", getJobStatus);
// router.get("/download/:jobId", downloadReport);

// export default router;
