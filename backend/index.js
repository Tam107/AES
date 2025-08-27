import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import gradingScore from "./routers/gradingScore.js";



const app = express();
dotenv.config();
const PORT = process.env.PORT;


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


app.use("", gradingScore);


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
});
