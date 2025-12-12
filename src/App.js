// src/App.js
import React, { useState, useEffect } from "react";
import { useMemo } from "react";
import UploadSection from "./component/UploadSection.jsx";
import SettingsPanel from "./component/SettingsPanel";
import PreviewPanel from "./component/PreviewPanel";
import { parseFirebaseMessages } from "./utils/parseFirebase";
import { useTranslation } from "react-i18next";
import "./App.css";
import "./styles/base.css";
import { main_style } from "./utils/FileDownload.js";

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

  const cloned = preview.cloneNode(true);
  cloned.querySelectorAll("button").forEach(btn => btn.remove());
  cloned.querySelectorAll("[data-dice='true']").forEach(el => {
    el.style.textAlign = "center";
    el.style.display = "block";
    el.style.margin = "8px 0";
  });
  const styles = Array.from(document.querySelectorAll("style"))
    .map(s => s.innerHTML)
    .join("\n");

  const html = `<!DOCTYPE html>
        <html lang="ko">
        <head>
        <meta charset="UTF-8" />
        <title>CCLog Export</title>
        <style>
        ${styles}
        .message-container {
          background: transparent !important;
        }

        </style>
        </head>
        <body class="dark-mode">
        <div class="ccfolia_wrap">
        ${cloned.innerHTML}
        </div>
        </body>
        </html>`;

          const blob = new Blob([html], { type: "text/html;charset=utf-8" });
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = "cclog_export.html";
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
  // secretEnabled={secretEnabled}
  // setSecretEnabled={setSecretEnabled}
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
