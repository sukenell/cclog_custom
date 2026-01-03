// src/App.js
import React, { useState, useEffect } from "react";
import UploadSection from "./component/UploadSection.jsx";
import SettingsPanel from "./component/SettingsPanel.jsx";
import PreviewPanel from "./component/PreviewPanel.jsx";
import { parseFirebaseMessages } from "./utils/parseFirebase.js";
import { useTranslation } from "react-i18next";
import "./AppV2.css";
import "../core/styles/base.css";
import { main_style } from "../v1/utils/FileDownload.js";

function App() {
  const { t } = useTranslation();

  const [fileContent, setFileContent] = useState([]);
  const [fileName, setFileName] = useState("log.html");

  const [charColors,] = useState({});
  const [charHeads] = useState({});
  const [titleImages, setTitleImages] = useState([]);
  const [endImages, setEndImages] = useState([]);
  const [inputTexts, setInputTexts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState({
    main: true,
    info: false,
    other: false,
  });
  const [diceEnabled, setDiceEnabled] = useState(true);
  const [tabColorEnabled, setTabColorEnabled] = useState(false);
  const [TabColor, setTabColor] = useState({});
  const [messages, setMessages] = useState([]);

  const handleTitleImageChange = (event) => {
    const urls = event.target.value
      .split(",")
      .map((u) => u.trim())
      .filter((u) => u);
    setTitleImages(urls);
  };

  const handleEndImageChange = (event) => {
    const urls = event.target.value
      .split(",")
      .map((u) => u.trim())
      .filter((u) => u);
    setEndImages(urls);
  };


const DescChange = (e) => {
  setInputTexts(
    e.target.value
      .split(",")
      .map(v => v === " " ? " " : v.trim())
      .filter(v => v !== "")
  );
};

  const updateMessage = (id, newValue) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...newValue } : msg))
    );
  };

const handleExportHTML = () => {
  const preview = document.getElementById("preview-scroll-box");
  if (!preview) return;

  // 1. 프리뷰 DOM 복사
  const cloned = preview.cloneNode(true);

  // 2. 편집용 UI 제거
  cloned.querySelectorAll("button").forEach((btn) => btn.remove());
  cloned.querySelectorAll("input").forEach((input) => input.remove());

  // 3. dice 중앙 정렬 강제 (export용)
  cloned.querySelectorAll("[data-dice='true']").forEach((el) => {
    el.style.display = "flex";
    el.style.flexDirection = "column";
    el.style.alignItems = "center";
    el.style.textAlign = "center";
    el.style.margin = "12px 0";
  });

  // 4. 현재 적용된 모든 <style> 수집
const minimalExportCSS = `
:root {
  --background-color: #2c2c2c;
  --text-color: white;
}

.ccfolia_wrap {
  padding: 10px;
  background: #2c2c2c;
  color: white;
}

/* 메시지 */
.message-container {
  display:flex;
  align-items:center;
  gap: 15px;
  padding: 8px 20px;
}

.message-container.main { color:white; }
.message-container.info { color:#9d9d9d; }
.message-container.other { color:gray; }

/* 아바타 */
.msg_container {
  width:40px;
  height:40px;
  overflow:hidden;
  border-radius:6px;
}

.msg_container img {
  width:100%;
  height:100%;
  object-fit:cover;
  object-position:top;
}

/* Dice / Desc */
.desc, .dice {
  text-align:center;
  font-weight:bold;
  font-style:italic;
}

/* Divider */
.message-divider {
  border:0;
  border-top:1px solid rgba(255,255,255,0.08);
}

.info,
.msg-normal-text,
.other,
.message-container span {
  white-space: pre-line;
}

`;


// 5. 최종 HTML 생성
const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>${fileName.replace(".html","")}</title>

<style>
${minimalExportCSS}
</style>

</head>
<body class="dark-mode">
  <div class="ccfolia_wrap">
    ${cloned.innerHTML}
  </div>
</body>
</html>`;


  // 6. 다운로드
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;

  const safeName = (fileName || "export")
  .replace(/\.[^/.]+$/, "")
  .replace(/[\\/:*?"<>|]+/g, "_");

  a.download = `${safeName}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};


          
  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = main_style;
    document.head.appendChild(styleTag);
  }, []);

  useEffect(() => {
  if (!fileContent || !fileContent.length) return;

  const parsed = parseFirebaseMessages(fileContent, {
    inputTexts,
    charColors,
    charHeads,
    tabColors: TabColor,
    diceEnabled,
    t,
  });

  const topImages = titleImages.map((url, idx) => ({
    id: `title-img-${idx}`,
    category: "image",
    position: "top",
    imgUrl: url,
  }));

  const bottomImages = endImages.map((url, idx) => ({
    id: `end-img-${idx}`,
    category: "image",
    position: "bottom",
    imgUrl: url,
  }));

  setMessages([
    ...topImages,
    ...parsed,
    ...bottomImages,
  ]);
}, [
  fileContent,
  titleImages,
  endImages,
  inputTexts,
  charColors,
  charHeads,
  TabColor,
  diceEnabled,
]);


  return (
    <div className="fix-layout">
      <div className="setting_container">
        <UploadSection
          setFileContent={setFileContent}
          setFileName={setFileName}
          t={t}
        />
      <SettingsPanel
        t={t}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        diceEnabled={diceEnabled}
        setDiceEnabled={setDiceEnabled}
        tabColorEnabled={tabColorEnabled}
        setTabColorEnabled={setTabColorEnabled}
        tabColors={TabColor}
        setTabColor={setTabColor}
        messages={messages}
      />

        <h4>
          04. {t("setting.title_img")}{" "}
          <b>(*{t("setting.warning_txt3")})</b>
        </h4>
        <input
          type="text"
          placeholder="URL"
          className="title_input"
          onChange={handleTitleImageChange}
        />

        <h4>
          05. {t("setting.end_img")}{" "}
          <b>(*{t("setting.warning_txt3")})</b>
        </h4>
        <input
          type="text"
          placeholder="URL"
          className="end_input"
          onChange={handleEndImageChange}
        />

        <h4>
          06. {t("setting.system_cha")}{" "}
          <b>(*{t("setting.limit_txt")})</b>
        </h4>
        <input
          type="text"
          placeholder="Name Input"
          className="system_input"
          onChange={DescChange}
        />
      </div>

    <PreviewPanel
      messages={messages}
      t={t}
      updateMessage={updateMessage}
      selectedCategories={selectedCategories}
      tabColors={TabColor}
      charColors={charColors}
      charHeads={charHeads}
      diceEnabled={diceEnabled}
      inputTexts={inputTexts} 
      onExportHTML={handleExportHTML}
      tabColorEnabled={tabColorEnabled}
    />

</div>
  );
}

export default App;
