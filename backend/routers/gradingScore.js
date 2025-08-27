import express from "express";
import {  gradingScore } from "../controllers/gradingScore.controllers.js";
import multer from "multer"
import fs from "fs"
import path from "path";
const router = express.Router();
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Thêm thời gian vào tên file để tránh trùng
    },
});

const upload = multer({ storage: storage });

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

router.post("/grading",upload.single("file"), gradingScore);

export default router;
