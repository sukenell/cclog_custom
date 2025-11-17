import React, { useState, useEffect } from "react";
import UploadSection from "./component/UploadSection.jsx";
import SettingsPanel from "./component//SettingsPanel";
import PreviewPanel from "./component//PreviewPanel";
import { handleDownload } from "./utils/FileDownload";
import { createImageSection, processMessageTag } from "./utils/utils";
import { useTranslation } from 'react-i18next';
import "./App.css";
import "./styles/base.css";
import { main_style } from "./utils/FileDownload.js"; 

function App() {

  const { t } = useTranslation();
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("log.html");
  const [charColors, setCharColors] = useState({});
  const [charHeads, setCharHeads] = useState({});
  const [titleImages, setTitleImages] = useState([]);
  const [endImages, setEndImages] = useState([]);
  // const [darkMode, setDarkMode] = useState(true); 
  const [inputTexts, setInputTexts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState({ main: true, info: false, other: false });
  const [diceEnabled, setDiceEnabled] = useState(true);
  const [secretEnabled, setSecretEnabled] = useState(false);
  const [tabColorEnabled, setTabColorEnabled] = useState(false);
  const [TabColor, setTabColor] = useState({});

  //함수 모음
  const onDownloadClick = (type) => {
    handleDownload(() => parseContent(false), fileName, type);
  };
  const handleTitleImageChange = (event) => {
    const inputText = event.target.value;
    const urls = inputText.split(",").map(url => url.trim()).filter(url => url);
    setTitleImages(urls);
  };
  const handleEndImageChange = (event) => {
    const inputText = event.target.value;
    const urls = inputText.split(",").map(url => url.trim()).filter(url => url);
    setEndImages(urls);
  };
  const DescChange = (event) => {
    const inputText = event.target.value;
    setInputTexts(inputText.split(",").map(text => text)); // trim() 제거로 공백도 인식 가능하게 수정.
  };
  const titleImagesHtml = createImageSection(titleImages);
  const endImagesHtml = createImageSection(endImages);
  
  const parseContent = (limitLines = true) => {
    if (!fileContent) return t("preview.file_upload");
    return typeof fileContent === "string" ? parseHtml(limitLines) : parseJson(limitLines);
  };
  
  const parseHtml = (limitLines = true) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(fileContent, "text/html");
    const parsedDivs = [];
    let count = { main: 0, info: 0, other: 0 };
    let lastCharName = null;
    let lastCategory = null;

    parsedDivs.push(titleImagesHtml);

    //일반 ccfolia_log 로 뽑았을시.
    Array.from(doc.querySelectorAll("p")).forEach((p) => {
      processMessageTag(p, "html", t, charHeads, charColors,
        diceEnabled, setDiceEnabled,
        secretEnabled, setSecretEnabled,
        tabColorEnabled, setTabColorEnabled,
        TabColor, setTabColor,
        limitLines, count, parsedDivs, lastCharName, lastCategory, inputTexts, selectedCategories, setSelectedCategories);
    });
    
    //파이어 베이스에서 메세지 가져 왔을시, 변환 후 재동작
    Array.from(doc.querySelectorAll("#__tab__all div")).forEach((div) => {
      const p = document.createElement("p");
      p.innerHTML = div.innerHTML;
      div.parentNode.replaceChild(p, div);
      processMessageTag(p, "html", t, charHeads, charColors,
        diceEnabled, setDiceEnabled,
        secretEnabled, setSecretEnabled,
        tabColorEnabled, setTabColorEnabled,
        TabColor, setTabColor,
        limitLines, count, parsedDivs, lastCharName, lastCategory, inputTexts, selectedCategories, setSelectedCategories);
    });

    parsedDivs.push(endImagesHtml);
    
    return parsedDivs.length > 0 ? parsedDivs.join("") : "출력할 데이터가 없습니다.";;
  };

  const parseJson = (limitLines = true) => {
    if (!fileContent) return t("preview.file_upload");
    if (!Array.isArray(fileContent)) return "올바른 JSON 형식이 아닙니다.";
  
    const parsedDivs = [];
    let count = { main: 0, info: 0, other: 0 };
    let lastCharName = null;
    let lastCategory = null;
  
    parsedDivs.push(titleImagesHtml);

    fileContent.forEach((log) => {
      const fields = log.fields;
      if (!fields) return;
      const category = fields.channelName?.stringValue || "other";
      const charName = fields.name?.stringValue === "" ? "NONAME" : fields.name?.stringValue || "";
      const charColors = fields.color?.stringValue || "#000000";
      const text = fields.text?.stringValue?.replace(/\n/g, "<br>") || "";
      const dice_text = fields.extend?.mapValue?.fields?.roll?.mapValue?.fields?.result?.stringValue || ""
      const charHeads = fields.iconUrl?.stringValue || "";
      // const tabColors = "#525569";
      const p = document.createElement("p");
      let createdAt = "";

      if (fields.createdAt?.timestampValue) {
          const datePart = fields.createdAt.timestampValue.split("T")[0];
          const [year, month, day] = datePart.split("-");
          createdAt = ` - ${year}/${month}/${day}`;
      }

      p.innerHTML = `
        <span>[${category}]</span> <span>${charName}</span><b>${createdAt}</b> : <span> ${text+dice_text}</span>
      `;
  
      processMessageTag(p, "json", t, charHeads, charColors,
        diceEnabled, setDiceEnabled,
        secretEnabled, setSecretEnabled,
        tabColorEnabled, setTabColorEnabled,
        TabColor, setTabColor,
        limitLines, count, parsedDivs, lastCharName, lastCategory, inputTexts, selectedCategories, setSelectedCategories);
    }); 
  
    parsedDivs.push(endImagesHtml);
    return parsedDivs.length > 0 ? parsedDivs.join("") : "출력할 데이터가 없습니다.";
  };
  

  useEffect(() => {
    
    const styleTag = document.createElement("style");
    styleTag.innerHTML = main_style;
    document.head.appendChild(styleTag);

    document.body.style.backgroundColor = "rgba(44, 44, 44, 0.87)";
    if (fileContent) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(fileContent, "text/html");
      const newCharColors = {};

      doc.querySelectorAll("p, div").forEach((el) => {
        const spans = el.getElementsByTagName("span");
        if (spans.length >= 2) {
          const charName = spans[1].textContent.trim();
          const rawColor = el.style.color || window.getComputedStyle(el).color;
          const convertedColor = rgbToHex(rawColor);
          newCharColors[charName] = convertedColor;
        }
      });
       setCharColors(newCharColors);
    }
  }, [fileContent]);

    const rgbToHex = (rgb) => {
      if (!rgb.startsWith("rgb")) return rgb;
      const rgbValues = rgb.match(/\d+/g);
      if (!rgbValues || rgbValues.length < 3) return "#FFFFFF";

      return `#${rgbValues
        .slice(0, 3)
        .map((val) => parseInt(val).toString(16).padStart(2, "0"))
        .join("")}`;
    };

  return (
    
    <div className="fix-layout">
      <div className="setting_container">
        <UploadSection setFileContent={setFileContent} setFileName={setFileName} t={t} />
        <SettingsPanel 
        t={t}
        charColors={charColors}
        setCharColors={setCharColors}
        charHeads={charHeads}
        setCharHeads={setCharHeads}
        titleImages={titleImages}
        handleTitleImageChange={handleTitleImageChange} 
        setTitleImages={setTitleImages}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        diceEnabled={diceEnabled}
        setDiceEnabled={setDiceEnabled}
        secretEnabled={secretEnabled}
        setSecretEnabled={setSecretEnabled}
        tabColorEnabled={tabColorEnabled}
        setTabColorEnabled={setTabColorEnabled}
        tabColors={TabColor}
        setTabColor={setTabColor}
      />
      
        <h4>05. {t("setting.title_img")} <b>(*{t("setting.warning_txt3")})</b></h4>
        <input type="text" placeholder="URL" className="title_input" 
          onChange={handleTitleImageChange} />

        <h4>06. {t("setting.end_img")} <b>(*{t("setting.warning_txt3")})</b></h4>
        <input type="text" placeholder="URL" className="end_input" 
          onChange={handleEndImageChange} />

        <h4>07. {t("setting.system_cha")} <b>(*{t("setting.limit_txt")})</b></h4>
        <input type="text" placeholder="Name Input" className="system_input" 
          onChange={DescChange}/>

      </div>

      <PreviewPanel
        t = {t}
        fileContent={fileContent}
        parseHtml={parseContent}
        charColors={charColors}
        charHeads={charHeads}
        titleImages={titleImages}
        selectedCategories={selectedCategories}
        diceEnabled={diceEnabled}
        secretEnabled={secretEnabled}
        onDownloadClick={onDownloadClick}
        tabColorEnabled={tabColorEnabled}
        setTabColorEnabled={setTabColorEnabled}
        tabColors={TabColor}
        setTabColor={setTabColor}
      />
      </div>
  );
}

export default App;
