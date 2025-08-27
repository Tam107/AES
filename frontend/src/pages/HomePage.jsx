import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { gradingScoreApi } from "../api/client/api";
import * as XLSX from 'xlsx';
import { Button, Spin, Table } from 'antd';
import toast from "react-hot-toast";

const HomePage = () => {
  // State to handle the selected subject
  const [selectedSubject, setSelectedSubject] = useState("");
  const [file, setFile] = useState(null);
  const [sheetData, setSheetData] = useState([]);
  const [columns,setColumns] = useState([])
  const [loading, setLoading] = useState(false);
  let subjects = [
    {
      val:1,
      name:"Bài tập Hà Nội học",
      code:"Ha_Noi_Hoc"
    },
    {
      val:2,
      name:"Bài tập Lịch sử văn minh thế giới 1",
      code:"Lich_Su_Van_Minh_1"
    },
    {
      val:3,
      name:"Bài tập Lịch sử văn minh thế giới 2",
      code:"Lich_Su_Van_Minh_2"
    },
    {
      val:4,
      name:"Lớp Văn bản tiếng Việt",
      code:"Lop_Van_Ban_Tieng_Viet"
    }
  ];
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
  
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: 'binary' });
  
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const filteredData = jsonData.filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
  
      setSheetData(filteredData);
  
      
        setLoading(true);
  
        gradingScoreApi(formData).then((res)=>{
          console.log(res);
          if (res && res?.results && res?.results?.length > 0) {
            const updatedData = filteredData.map((row, index) => {
              let newItem = res.results.find(item => item.id.toString() === row[4].toString());
              if (index === 0) {
                return [...row, "Nhận xét"];
              }
              if (newItem) {
                let review = `
                  <p>Nhận xét bài luận</p>
                  <p>1. Nội dung</p>
                  <p>${newItem.review["Nội dung"]["Nhận xét"]}.</p>
                  <p>Đánh giá: ${newItem.review["Nội dung"]["Điểm"]} điểm</p>
                  <p>2. Phong cách </p>
                  <p>${newItem.review["Phong cách"]["Nhận xét"]}.</p>
                  <p>Đánh giá: ${newItem.review["Phong cách"]["Điểm"]} điểm</p>
                  <p>3. Hình thức </p>
                  <p>${newItem.review["Hình thức"]["Nhận xét"]}.</p>
                  <p>Đánh giá: ${newItem.review["Hình thức"]["Điểm"]} điểm</p>
                  <p>4. Sáng tạo </p>
                  <p>${newItem.review["Sáng tạo"]["Nhận xét"]}.</p>
                  <p>Đánh giá: ${newItem.review["Sáng tạo"]["Điểm"]} điểm</p>
                  <br/>
                  <p>Tổng điểm: ${newItem.review["Tổng điểm"]["Điểm"]} điểm</p>
                  <p>Nhận xét chung: ${newItem.review["Nhận xét chung"]}</p>
                `;
                return [...row, review];
              }  
              return [...row, ""];
            });
            setSheetData(updatedData);
          } else {
            console.log(res);
            console.error("API không trả về dữ liệu đúng");
          }
        }).catch(error=>{
          console.log(res);
          console.log(error);
          toast.error("Có lỗi xảy ra khi gọi API");
        }).finally(()=>{
          setLoading(false); // Clear loading state
        }
        );
    };
    reader.readAsBinaryString(file);
  };
  
  const removeHTMLTags = (str) => {
    return str.replace(/<\/?[^>]+(>|$)/g, ""); // Loại bỏ tất cả thẻ HTML
  };
  useEffect(() => {
    let dataColumns = sheetData[0]?.map((header, index) => ({
      title: header,
      dataIndex: index.toString(),
      key: index.toString(),
      width: 20,
      align: 'top',
    }));
    if(dataColumns && dataColumns.length > 0){
      dataColumns[dataColumns?.length - 1].width = 600;
      dataColumns[dataColumns?.length - 2].width = 600;
      dataColumns[dataColumns?.length - 1].render = (text) => (
        <div dangerouslySetInnerHTML={{ __html: text }} />
      );
    }
    setColumns(dataColumns);
  }, [file, sheetData, loading]);

  const data = sheetData.slice(1).map((row, index) => {
    const rowData = {};
    row.forEach((cell, i) => {
      rowData[i.toString()] = cell;
    });
    return { key: index, ...rowData };
  });

  

  const handleExport = () => {
    const newData = data.map(item => {
      return {
        "Dấu thời gian": item["0"],  
        "Địa chỉ email": item["1"],   
        "Họ và tên sinh viên": item["2"],
        [subjects.find(i => i.val == selectedSubject)?.name || "Môn học"]: item["3"],
        "Mã số sinh viên": item["4"],
        "Số thứ tự" : item["5"],
        "Câu trả lời": item["6"],
        "Nhận xét": removeHTMLTags(item["7"] || ""),
      };
    });
    const ws = XLSX.utils.json_to_sheet(newData,{raw: true});  
    const wb = XLSX.utils.book_new();  
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");  
    XLSX.writeFile(wb, `cham_diem_${subjects.find(i => i.val == selectedSubject)?.name || "Môn học"}.xlsx`);  
  };

  return (
    <>
    {
      loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 pr-12 rounded-lg shadow-lg flex flex-col justify-center items-center">
            <Spin
              size="large" 
              className="mb-4" 
              indicator={
                <div className="flex pl-[-20px] justify-center items-center">
                  <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16 mb-4 text-center animate-spin border-t-transparent"></div>
                </div>
              }
            />
            <h2 className="text-xl text-center pl-4 font-semibold mt-6">Đang xử lý, vui lòng chờ...</h2>
          </div>
        </div>
      )
    }
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
            {
              subjects.map((subject) => (
                <option key={subject.val} value={subject.val}>{subject.name}</option>
              ))
            }
            
          </select>
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={loading}
          className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-all"
        >
          Tải lên
        </button>
        <div>
        <h3>Dữ liệu từ file Excel:</h3>
        <div className="w-full flex justify-end">
          <Button className="mb-2" onClick={handleExport}>Xuất file Excel</Button>
        </div>
        <div className="overflow-x-auto">
        <Table
  columns={columns}
  dataSource={data}
  pagination={false}
  scroll={{ x: 'max-content' }} // Cho phép cuộn ngang khi nội dung vượt quá chiều rộng
  className="table-auto shadow-lg rounded-lg border-collapse"
  rowClassName="border-b border-gray-200"
  theadClassName="bg-gray-100 text-gray-700 font-semibold"
  tdClassName="py-3 px-4 text-left text-gray-600"
  thClassName="py-3 px-4 text-left text-gray-800"
/>

</div>

      </div>
      </div>
    </>
  );
};

export default HomePage;
