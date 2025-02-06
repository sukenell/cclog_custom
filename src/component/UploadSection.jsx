import React from "react";
import FileUploader from "../utils/FileUploader.js"

const UploadSection = ({ setFileContent, setFileName }) => {
  return (
    <div>
      <h2>CCFolia 채팅 로그 커스텀</h2>
      <p>
        *커스텀 하지 않은 코코포리아 로그 외에는 인식하지 않습니다{" "}
        <a href="https://www.postype.com/@nell-dev/post/18656933">(사용법)</a>
      </p>
      <h4>01. 파일 업로드</h4>
      <FileUploader setFileContent={setFileContent} setFileName={setFileName} />
    </div>
  );
};

export default UploadSection;
