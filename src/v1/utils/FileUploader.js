import React, { useState } from "react";

function FileUploader({ t, setFileContent, setFileName }) {
  const [pendingFileContent, setPendingFileContent] = useState(null);
  const [pendingFileName, setPendingFileName] = useState("");

  const handleFileUpload = (event) => {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        try {
          setPendingFileContent(content);
          setPendingFileName(file.name);
        } catch (error) {
          alert(t("setting.file_type"));
        }
      };
      reader.readAsText(file);
    }
  };

  const handleConfirm = () => {
    if (pendingFileContent === null) {
      alert(t("setting.none_file"));
      return;
    }

    setFileContent(pendingFileContent);
    setFileName(pendingFileName || "log.html");
  };
  
  return (
    <div>
      <div className="file_upload" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        
        <input type="file" accept=".html" onChange={handleFileUpload} />
        <button type="button" onClick={handleConfirm}>
          {t("setting.ok")}
        </button>
      </div>
    </div>
  );
}

export default FileUploader;
