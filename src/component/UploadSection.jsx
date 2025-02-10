import React, { useState } from "react";
import FileUploader from "../utils/FileUploader.js";
import i18n from "../locales/i18n.ts";

const UploadSection = ({ setFileContent, setFileName, t }) => {
  const [language, setLanguage] = useState(i18n.language || "ko");


  const handleLanguageChange = (event) => {
    const selectedLanguage = event.target.value;
    setLanguage(selectedLanguage);
    i18n.changeLanguage(selectedLanguage);
  };


  return (
    <div>
      <h2>CCFolia {t("setting.title")}</h2>
      <p>
        *{t("setting.warning_txt")}{" "}
        <a href="https://www.postype.com/@nell-dev/post/18656933">({t("setting.Howtouse")})</a>
      </p>
      <div>
      <label htmlFor="language-select">{t("setting.select_lang")}: </label>
        <select id="language-select"  onChange={handleLanguageChange}>
          <option value="ko" >한국어</option>
          <option value="en" >English</option>
          <option value="jp">日本語</option>
          <option value="zh">中文</option>
        </select>
      </div>

      <h4>01.{t("setting.file_upload")} <b>{t("setting.help")}</b> | or | {t("setting.room_log_1")} <b>{t("setting.room_log_2")}</b></h4>
      <FileUploader t={t} setFileContent={setFileContent} setFileName={setFileName} />

    </div>
  );
};

export default UploadSection;
