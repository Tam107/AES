import React, { useState } from "react";
import Header from "../components/Header";
import { gradingScoreApi } from "../api/client/api";

const HomePage = () => {
  // State to handle the selected subject
  const [selectedSubject, setSelectedSubject] = useState("");
  const [file, setFile] = useState(null);

  // Handle file change
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  // Handle subject change
  const handleSubjectChange = (event) => {
    setSelectedSubject(event.target.value);
  };

  // Handle form submission (file + subject)
  const handleUpload = async () => {
    if (!file || !selectedSubject) {
      alert("Vui lòng chọn cả môn học và file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("subject", selectedSubject);
    await gradingScoreApi(formData);
  };

  return (
    <>
      <Header />
      <div className="w-full text-center p-4">
        <h1 className="text-3xl font-bold mb-4">Công cụ chấm điểm từ file Excel</h1>
        <p className="mb-4 text-lg">Chào mừng bạn đến với công cụ chấm điểm tự động từ file Excel. Hãy bắt đầu bằng cách tải lên file của bạn.</p>

        {/* File input */}
        <input
          type="file"
          className="mt-4 border border-gray-300 rounded p-2"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
        />

        {/* Select box for subjects */}
        <div className="mt-4">
          <label htmlFor="subject" className="mr-2 text-lg">Chọn môn học:</label>
          <select
            id="subject"
            value={selectedSubject}
            onChange={handleSubjectChange}
            className="mt-2 border border-gray-300 rounded p-2"
          >
            <option value="">Chọn môn</option>
            <option value="1">Bài tập Hà Nội học</option>
            <option value="2">Bài tập Lịch sử văn minh thế giới 1</option>
            <option value="3">Bài tập Lịch sử văn minh thế giới 2</option>
            
          </select>
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-all"
        >
          Tải lên
        </button>
      </div>
    </>
  );
};

export default HomePage;
