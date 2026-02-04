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


const splitByMessageBlocks = (container, maxChars) => {
  const chunks = [];
  let currentChunk = "";
  let currentLength = 0;

  const nodes = Array.from(container.childNodes);

  nodes.forEach((node) => {
    const html = node.outerHTML || node.textContent || "";

    if (currentLength + html.length > maxChars && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = "";
      currentLength = 0;
    }

    currentChunk += html;
    currentLength += html.length;
  });

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
};

/* =========================
   EXPORT CSS
========================= */
/* =========================
   EXPORT CSS
========================= */
const minimalExportCSS = `
:root {
  --background-color: rgba(44, 44, 44, 0.87);
  --text-color: white;
  --border-color: rgba(255, 255, 255, 0.08);
}

h2 {
  margin: auto;
}

h4 {
  margin-bottom: 0;
}

h4 b {
  font-size: 13px;
  font-weight: 400;
  font-style: oblique;
}

a {
  color: white;
}

.desc,
.dice {
  padding-left: 0;
  width: 100%;
  color: rgb(221, 221, 221);
  font-style: italic !important;
  font-weight: bold !important;
  text-align: center !important;
}

span {
  word-break: break-all;
  overflow-wrap: anywhere;
}

.fix-layout {
  display: flex;
  height: 95vh;
}

.ccfolia_wrap {
  position: relative;
  padding: 10px !important;
  background-color: #2c2c2cde;
  color: #fefefe;
}

.msg_container {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.msg_container img {
  image-rendering: -webkit-optimize-contrast;
  transform: translateZ(0);
  backface-visibility: hidden;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

p {
  margin: 0;
}

.gap {
  gap: 15px;
  display: flex;
  -webkit-box-pack: start;
  justify-content: flex-start;
  align-items: flex-start;
  position: relative;
  text-decoration: none;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  padding: 16px 16px;
}

.gap strong {
  padding: 3px;
}

b {
  color: gray;
  font-size: 9pt;
  font-weight: 200;
}

.message-container {
  display: flex;
  align-items: center;
  padding: 0;
}

.message-container.main {
  background-color: #313131;
  color: white;
}

.message-container.info {
  background-color: #454545;
  color: #9d9d9d;
}

.message-container.other {
  color: gray;
  background-color: transparent;
  padding: 12px 0 12px 48px;
  margin: 8px;
}

.message-container.desc,
.message-container.dice {
  padding-left: 0;
  width: 100%;
  color: rgb(255, 255, 255);
  font-style: italic;
  font-weight: bold;
  text-align: center;
}

.message-divider {
  margin: 0;
  padding: 0;
  border: 0;
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.msg-info-text,
.msg-other-text,
.msg-normal-text {
  white-space: pre-line;
  word-break: break-all;
  overflow-wrap: anywhere;
}

.msg-other-box {
  padding: 10px 12px;
  border-radius: 8px;
  background: #4b4b4b;
  color: #d3d3d3;
}

.msg-other-name {
  color: #ffcd6b;
  font-weight: bold;
  font-size: 13px;
}

.msg-normal-text {
  color: white;
}
`;

function App() {
  const { t } = useTranslation();

  const [fileContent, setFileContent] = useState([]);
  const [fileName, setFileName] = useState("log.html");

  const [charColors] = useState({});
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

  const handleTitleImageChange = (e) => {
    setTitleImages(
      e.target.value.split(",").map(v => v.trim()).filter(Boolean)
    );
  };

  const handleEndImageChange = (e) => {
    setEndImages(
      e.target.value.split(",").map(v => v.trim()).filter(Boolean)
    );
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
    setMessages(prev =>
      prev.map(msg => msg.id === id ? { ...msg, ...newValue } : msg)
    );
  };

  const handleExportHTML = () => {
    const preview = document.getElementById("preview-scroll-box");
    if (!preview) return;

    const cloned = preview.cloneNode(true);
    cloned.querySelectorAll("button, input").forEach(el => el.remove());

    // 1. innerHTML 가져오기
    let rawHtml = cloned.innerHTML;

    // 2. 가독성을 위한 포맷팅 (간이 Beautify)
    // - 태그 사이에 줄바꿈 추가
    // - <hr> 태그 주변에 줄바꿈 추가
    // - 불필요한 공백 제거
    rawHtml = rawHtml
      .replace(/><\/div>/g, ">\n</div>") // 닫는 div 앞에 줄바꿈
      .replace(/<\/div><div/g, "</div>\n<div") // div 사이에 줄바꿈
      .replace(/<hr/g, "\n<hr") // hr 앞에 줄바꿈
      .replace(/<\/hr>/g, "</hr>\n") // hr 뒤에 줄바꿈 (hr은 self-closing일수도 있지만)
      .replace(/class="message-divider"([^>]*)>/g, 'class="message-divider"$1>\n'); // hr 태그 뒤에 확실히 줄바꿈

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>${fileName.replace(".html", "")}</title>
<style>
${minimalExportCSS}
</style>
</head>
<body class="dark-mode">
  <div class="ccfolia_wrap">
${rawHtml}
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };


  const handleExportSplitHTML = () => {
    const preview = document.getElementById("preview-scroll-box");
    if (!preview) return;

    const cloned = preview.cloneNode(true);
    cloned.querySelectorAll("button, input").forEach(el => el.remove());

    const MAX_CHARS = 7000000;

    const chunks = splitByMessageBlocks(cloned, MAX_CHARS);

    const safeName = (fileName || "export")
      .replace(/\.[^/.]+$/, "")
      .replace(/[\\/:*?"<>|]+/g, "_");

    chunks.forEach((content, idx) => {
      const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>${safeName} (${idx + 1})</title>
<style>
${minimalExportCSS}
</style>
</head>
<body class="dark-mode">
  <div class="ccfolia_wrap">
    ${content}
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName} (${idx + 1}).html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  };

  /* =========================
     EFFECTS
  ========================= */
  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = main_style;
    document.head.appendChild(styleTag);
  }, []);

  useEffect(() => {
    if (!fileContent.length) return;

    const parsed = parseFirebaseMessages(fileContent, {
      inputTexts,
      charColors,
      charHeads,
      tabColors: TabColor,
      diceEnabled,
      t,
    });

    const topImages = titleImages.map((url, i) => ({
      id: `title-img-${i}`,
      category: "image",
      position: "top",
      imgUrl: url,
    }));

    const bottomImages = endImages.map((url, i) => ({
      id: `end-img-${i}`,
      category: "image",
      position: "bottom",
      imgUrl: url,
    }));

    setMessages([...topImages, ...parsed, ...bottomImages]);
  }, [
    fileContent,
    titleImages,
    endImages,
    inputTexts,
    TabColor,
    diceEnabled,
  ]);

  /* =========================
     RENDER
  ========================= */
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

        <h4>04. {t("setting.title_img")}</h4>
        <input className="title_input" onChange={handleTitleImageChange} />

        <h4>05. {t("setting.end_img")}</h4>
        <input className="end_input" onChange={handleEndImageChange} />

        <h4>06. {t("setting.system_cha")}</h4>
        <input className="system_input" onChange={DescChange} />
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
        tabColorEnabled={tabColorEnabled}
        onExportHTML={handleExportHTML}
        onExportSplitHTML={handleExportSplitHTML}
      />
    </div>
  );
}

export default App;
