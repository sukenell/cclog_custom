// src/components/FileUploader.js
import React from "react";

function FileUploader({ setFileContent, setFileName }) {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="file_upload">
      <input type="file" accept=".html" onChange={handleFileUpload} />
    </div>
  );
}

export default FileUploader;
