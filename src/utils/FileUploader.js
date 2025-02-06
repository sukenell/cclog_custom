// src/components/FileUploader.js
import React from "react";

function FileUploader({ setFileContent, setFileName }) {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        if (file.type === "application/json") {
          try {
            setFileContent(JSON.parse(content));
          } catch (error) {
            console.error("Invalid JSON file:", error);
            alert("올바른 JSON 형식이 아닙니다.");
          }
        } else {
          setFileContent(content);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="file_upload">
      <input type="file" accept=".html,.json" onChange={handleFileUpload} />
    </div>
  );
}

export default FileUploader;
