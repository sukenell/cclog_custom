import React from "react";
import FileUploader from "../../v1/utils/FileUploader.js";
import "../../core/locales/i18n.ts";

const UploadSection = ({ setFileContent, setFileName, t }) => {
    // const [roomId, setRoomId] = useState("");


  return (
    <div>
      <h2>CCFolia {t("setting.title")}</h2>
      <p>
        *{t("setting.warning_txt")}{" "}
        <a href="https://www.postype.com/@reha-dev/post/18656933">({t("setting.Howtouse")})</a>
      </p>
      {/*
      <div>
        <label htmlFor="language-select">{t("setting.select_lang")}: </label>
        <select id="language-select"  onChange={handleLanguageChange}>
          <option value="ko" >한국어</option>
          <option value="en" >English</option>
          <option value="jp">日本語</option>
          <option value="zh">中文</option>
        </select>
      </div>
      */}

      <h4>01. {t("setting.room_log_1")}</h4>
      <FileUploader
  setFileContent={setFileContent}
  setFileName={setFileName}
  t={t}
/>

    </div>
  );
};

export default UploadSection;
