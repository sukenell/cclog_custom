import React, { useState } from "react";
import FileUploader from "../utils/FileUploader.js";
import i18n from "../locales/i18n.ts";

const UploadSection = ({ setFileContent, setFileName, t }) => {
  const [language, setLanguage] = useState(i18n.language || "ko");

    const [roomId, setRoomId] = useState("");

  // const fetchMessages = async () => {
  //   if (!roomId) return alert("Room ID를 입력해주세요");
  //   const url = `${process.env.REACT_APP_FIREBASE_BASE_URL}${roomId}`;
  //   try {
  //     const res = await fetch(url);
  //     if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  //     const data = await res.json();
  //     setFileName(roomId); // 파일 이름처럼 저장
  //     // Firestore의 variables.arrayValue.values를 App으로 전달
  //     const logs = data.fields?.variables?.arrayValue?.values || [];
  //     setFileContent(logs); 
  //   } catch (err) {
  //     console.error("데이터를 가져오는 중 오류 발생:", err);
  //     alert("데이터를 가져오는 중 오류 발생: " + err.message);
  //   }
  // };

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
        <a href="https://www.postype.com/@reha-dev/post/18656933">({t("setting.Howtouse")})</a>
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

      <h4>01. {t("setting.room_log_1")} <b>{t("setting.room_log_2")}</b></h4>
      <FileUploader
  setFileContent={setFileContent}
  setFileName={setFileName}
  t={t}
/>

    </div>
  );
};

export default UploadSection;
