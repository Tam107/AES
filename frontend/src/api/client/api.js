import axios from "../axios.custom.js"
const gradingScoreApi = async (formData) => {
    try {
        const response = await axios.post("/grading", formData);

        if (response.status === 200) {
            const data = response.data;
            return data;
        }
        else return {}
    } catch (error) {
        console.error("Error uploading file", error);
    }
}

export {
    gradingScoreApi
}