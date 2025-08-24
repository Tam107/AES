import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import path from  "path";
import fs from "fs";
import {v4 as uuidv4} from "uuid";


import chatRoute from "./routers/old/chat.js";

import adminsRoute from "./routers/old/admin.js";
import apiRoute from "./routers/old/api.js";
import documentRoute from "./routers/old/document.js";
import swaggerDocs from "./swagger.js";
import cookieParser from "cookie-parser"; // Keep .jsx if necessary
import cors from "cors";
import {connectToDb} from "./config/mongodb.js";
import fileRoutes from "./routers/fileRoutes.js";
import {getGradingJobCollection} from "./models/GradingJob.js";
import {fileProcessingQueue, reportGenerationQueue} from "./queue/gradingQueue.js";


const uploadsDir = path.join(process.cwd(), 'uploads');
const resultsDir = path.join(process.cwd(), 'results');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir);


const app = express();
dotenv.config();
const PORT = process.env.PORT;

// connect to MongoDB
connectToDb()


//middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(express.static("public"));
app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://ss2-11x.pages.dev"
    ],
    credentials: true
}));

// route

app.use("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is healthy"
    });
});


// app.use("/api/auth", googleAuthRoute);
// app.use("/api/users", usersRoute);
app.use("/api/admin", adminsRoute);
app.use("/api/callAPI/", apiRoute);
app.use("/api/document/", documentRoute);
app.use("/api/chat/", chatRoute);
app.use("", fileRoutes);


app.use((error, req, res, next) => {
    const errorStatus = error.status || 500;
    const errorMessage = error.message || "Something went wrong";
    return res.status(errorStatus).json({
        success: false,
        status: errorStatus,
        message: errorMessage,
        // stack: error.stack,
    });
})

app.listen(PORT, () => {
    console.log(`App listening on 8080`);
    swaggerDocs(app, PORT); // Initialize Swagger
});
