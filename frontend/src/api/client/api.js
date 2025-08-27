import axios from "../axios.custom.js"
const gradingScoreApi = async (formData) => {
    try {
        const response = await axios.post("/grading", formData);
        console.log(response);
        
        return response;
    } catch (error) {
        console.error("Error uploading file", error);
    }
}

export {
    gradingScoreApi
}