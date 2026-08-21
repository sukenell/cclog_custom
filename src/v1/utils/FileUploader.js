import React, { useId, useState } from "react";

const translate = (t, key, fallback) => {
  if (typeof t !== "function") return fallback;

  try {
    const translated = t(key, { defaultValue: fallback });
    return typeof translated === "string" &&
      translated.trim() !== "" &&
      translated !== key
      ? translated
      : fallback;
  } catch (_error) {
    return fallback;
  }
};

function FileUploader({ t, setFileContent, setFileName }) {
  const [pendingFileContent, setPendingFileContent] = useState(null);
  const [pendingFileName, setPendingFileName] = useState("");
  const generatedId = useId().replace(/:/g, "");
  const fileInputId = `log-file-upload-${generatedId}`;

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
      <div className="file_upload">
        <label className="file-upload-label" htmlFor={fileInputId}>
          {translate(t, "setting.file", "파일 선택")}
        </label>
        <input
          id={fileInputId}
          type="file"
          accept=".html"
          onChange={handleFileUpload}
        />
        <button type="button" onClick={handleConfirm}>
          {t("setting.ok")}
        </button>
      </div>
    </div>
  );
}

export default FileUploader;
