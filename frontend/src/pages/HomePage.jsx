import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { gradingScoreApi } from "../api/client/api";
import * as XLSX from "xlsx";
import { Button, Spin, Table, Card, Select, Upload, Typography } from "antd";
import { UploadOutlined, FileExcelOutlined } from "@ant-design/icons";
import toast from "react-hot-toast";

const { Option } = Select;
const { Title, Paragraph } = Typography;

const HomePage = () => {
  const [selectedSubject, setSelectedSubject] = useState("");
  const [file, setFile] = useState(null);
  const [sheetData, setSheetData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);

  const subjects = [
    { val: 1, name: "Bài tập Hà Nội học", code: "Ha_Noi_Hoc" },
    { val: 2, name: "Bài tập Lịch sử văn minh thế giới 1", code: "Lich_Su_Van_Minh_1" },
    { val: 3, name: "Bài tập Lịch sử văn minh thế giới 2", code: "Lich_Su_Van_Minh_2" },
    { val: 4, name: "Lớp Văn bản tiếng Việt", code: "Lop_Van_Ban_Tieng_Viet" },
  ];

  const handleFileChange = (info) => {
    if (info.fileList && info.fileList.length > 0) {
      const lastFile = info.fileList[info.fileList.length - 1].originFileObj;
      setFile(lastFile);
    } else {
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedSubject) {
      toast.error("Vui lòng chọn cả môn học và file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("subject", selectedSubject);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const filteredData = jsonData.filter((row) =>
          row.some((cell) => cell !== null && cell !== undefined && cell !== "")
      );

      setSheetData(filteredData);
      setLoading(true);

      gradingScoreApi(formData)
          .then((res) => {
            if (res?.results?.length > 0) {
              const updatedData = filteredData.map((row, index) => {
                let newItem = res.results.find(
                    (item) => item.id.toString() === row[4]?.toString()
                );
                if (index === 0) return [...row, "Nhận xét"];
                if (newItem) {
                  let review = `
                  <div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 12px; border: 1px solid #e8e8e8; border-radius: 8px; background-color: #f9f9f9; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <p style="font-weight: bold; margin-bottom: 12px; color: #333;">Nhận xét bài luận</p>
                    <p style="font-weight: bold; color: #555;">1. Nội dung</p>
                    <p style="margin-bottom: 4px;">${newItem.review["Nội dung"]["Nhận xét"]}.</p>
                    <p style="margin-bottom: 12px;">Đánh giá: <span style="font-weight: bold; color: #1890ff;">${newItem.review["Nội dung"]["Điểm"]} điểm</span></p>
                    <p style="font-weight: bold; color: #555;">2. Phong cách</p>
                    <p style="margin-bottom: 4px;">${newItem.review["Phong cách"]["Nhận xét"]}.</p>
                    <p style="margin-bottom: 12px;">Đánh giá: <span style="font-weight: bold; color: #1890ff;">${newItem.review["Phong cách"]["Điểm"]} điểm</span></p>
                    <p style="font-weight: bold; color: #555;">3. Hình thức</p>
                    <p style="margin-bottom: 4px;">${newItem.review["Hình thức"]["Nhận xét"]}.</p>
                    <p style="margin-bottom: 12px;">Đánh giá: <span style="font-weight: bold; color: #1890ff;">${newItem.review["Hình thức"]["Điểm"]} điểm</span></p>
                    <p style="font-weight: bold; color: #555;">4. Sáng tạo</p>
                    <p style="margin-bottom: 4px;">${newItem.review["Sáng tạo"]["Nhận xét"]}.</p>
                    <p style="margin-bottom: 12px;">Đánh giá: <span style="font-weight: bold; color: #1890ff;">${newItem.review["Sáng tạo"]["Điểm"]} điểm</span></p>
                    <p style="font-weight: bold; color: #555; margin-top: 8px;">Tổng điểm: <span style="color: #52c41a;">${newItem.review["Tổng điểm"]["Điểm"]} điểm</span></p>
                    <p style="font-weight: bold; color: #555; margin-top: 12px;">Nhận xét chung:</p>
                    <p>${newItem.review["Nhận xét chung"]}</p>
                  </div>
                `;
                  return [...row, review];
                }
                return [...row, ""];
              });
              setSheetData(updatedData);
            } else {
              console.error("API không trả về dữ liệu đúng", res);
            }
          })
          .catch((error) => {
            console.error(error);
            toast.error("Có lỗi xảy ra khi gọi API");
          })
          .finally(() => {
            setLoading(false);
          });
    };
    reader.readAsBinaryString(file);
  };

  const removeHTMLTags = (str) => str.replace(/<\/?[^>]+(>|$)/g, "");

  useEffect(() => {
    if (sheetData.length > 0) {
      const columnWidths = [160, 220, 180, 200, 120, 100, 500, 700]; // Adjusted widths for better content display: wider for "Câu trả lời" (index 6) and "Nhận xét" (index 7)
      const dataColumns = sheetData[0].map((header, index) => ({
        title: header,
        dataIndex: index.toString(),
        key: index.toString(),
        width: columnWidths[index],
        align: "left",
        ellipsis: { showTitle: false },
        render: (text) => {
          if (index === sheetData[0].length - 1) { // "Nhận xét" column
            return <div dangerouslySetInnerHTML={{ __html: text }} />;
          } else if (index === sheetData[0].length - 2) { // "Câu trả lời" column
            return <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", hyphens: "auto" }}>{text}</div>;
          }
          return text;
        },
      }));
      setColumns(dataColumns);
    }
  }, [sheetData]);

  const data = sheetData.slice(1).map((row, index) => {
    const rowData = {};
    row.forEach((cell, i) => {
      rowData[i.toString()] = cell;
    });
    return { key: index, ...rowData };
  });

  const handleExport = () => {
    const newData = data.map((item) => ({
      "Dấu thời gian": item["0"],
      "Địa chỉ email": item["1"],
      "Họ và tên sinh viên": item["2"],
      [subjects.find((i) => i.val == selectedSubject)?.name || "Môn học"]: item["3"],
      "Mã số sinh viên": item["4"],
      "Số thứ tự": item["5"],
      "Câu trả lời": item["6"],
      "Nhận xét": removeHTMLTags(item["7"] || ""),
    }));

    const ws = XLSX.utils.json_to_sheet(newData, { raw: true });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(
        wb,
        `cham_diem_${subjects.find((i) => i.val == selectedSubject)?.name || "MonHoc"}.xlsx`
    );
  };

  return (
      <>
        {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <Card className="p-8 text-center shadow-2xl rounded-xl">
                <Spin size="large" />
                <Paragraph className="text-lg font-semibold mt-4">
                  Đang xử lý, vui lòng chờ...
                </Paragraph>
              </Card>
            </div>
        )}

        <Header />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Card className="shadow-xl rounded-2xl p-8 mb-8 bg-gradient-to-r from-blue-50 to-indigo-50">
            <Title level={2} className="text-center mb-4 text-indigo-700">
              Công cụ Chấm Điểm Tự Động Từ File Excel
            </Title>
            <Paragraph className="text-center mb-6 text-gray-600">
              Chào mừng bạn đến với công cụ chấm điểm tự động. Hãy tải lên file Excel và chọn môn học để bắt đầu quy trình chấm điểm một cách hiệu quả.
            </Paragraph>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <Upload
                  accept=".xlsx,.xls"
                  beforeUpload={() => false}
                  onChange={handleFileChange}
                  showUploadList={{ showRemoveIcon: true }}
                  className="w-full md:w-auto"
              >
                <Button icon={<UploadOutlined />} type="primary" size="large">
                  Chọn File Excel
                </Button>
              </Upload>

              <Select
                  placeholder="Chọn môn học"
                  value={selectedSubject}
                  onChange={(value) => setSelectedSubject(value)}
                  size="large"
                  className="w-full md:w-64"
              >
                {subjects.map((s) => (
                    <Option key={s.val} value={s.val}>
                      {s.name}
                    </Option>
                ))}
              </Select>

              <Button
                  type="primary"
                  size="large"
                  className="bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto"
                  onClick={handleUpload}
                  disabled={loading}
              >
                Tải Lên & Chấm Điểm
              </Button>
            </div>

            {file && (
                <Paragraph className="text-gray-500 mt-4 text-center">
                  📎 File đã chọn: {file.name}
                </Paragraph>
            )}
          </Card>

          {data.length > 0 && (
              <Card className="shadow-xl rounded-2xl p-6 bg-white">
                <div className="flex justify-between items-center mb-6">
                  <Title level={4} className="font-semibold text-gray-800">
                    Kết Quả Chấm Điểm
                  </Title>
                  <Button
                      icon={<FileExcelOutlined />}
                      onClick={handleExport}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="large"
                  >
                    Xuất File Excel
                  </Button>
                </div>
                <Table
                    columns={columns}
                    dataSource={data}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    scroll={{ x: 1500, y: 500 }}
                    bordered
                    rowClassName={(record, index) => (index % 2 === 0 ? "bg-gray-50" : "")}
                    className="rounded-lg overflow-hidden shadow-sm"
                />
              </Card>
          )}
        </div>
      </>
  );
};

export default HomePage;