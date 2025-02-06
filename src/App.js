import React, { useState, useEffect } from "react";
import UploadSection from "./component/UploadSection.jsx";
import SettingsPanel from "./component//SettingsPanel";
import PreviewPanel from "./component//PreviewPanel";
import { handleDownload } from "./utils/FileDownload";
import { createImageSection, processMessageTag } from "./utils/utils";
import "./App.css";
import "./styles/base.css";

function App() {

  const linecount = 10;
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("custom_log.html");
  const [charColors, setCharColors] = useState({});
  const [charHeads, setCharHeads] = useState({});
  const [titleImages, setTitleImages] = useState([]);
  const [endImages, setEndImages] = useState([]);
  const [darkMode, setDarkMode] = useState(true); 
  const [inputTexts, setInputTexts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState({ main: true, info: false, other: false });



  const onDownloadClick = (type) => {
    handleDownload(() => parseContent(false), fileName, type, darkMode);
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
    setInputTexts(inputText.split(",").map(text => text.trim()));
  };
  

  const titleImagesHtml = createImageSection(titleImages);
  const endImagesHtml = createImageSection(endImages);
  
  const parseContent = (limitLines = true) => {
    if (!fileContent) return "파일을 업로드하세요.";
    return typeof fileContent === "string" ? parseHtml(limitLines) : parseJson(limitLines);
  };
  

  const parseHtml = (limitLines = true) => {
    if (!fileContent) return "파일을 업로드하세요.";
    const parser = new DOMParser();
    const doc = parser.parseFromString(fileContent, "text/html");
    const parsedDivs = [];
    let count = { main: 0, info: 0, other: 0 };
    let lastCharName = null;
    let lastCategory = null;

    parsedDivs.push(titleImagesHtml);

    //일반 ccfolia_log 로 뽑았을시.
    Array.from(doc.querySelectorAll("p")).forEach((p) => {
      processMessageTag(p, "html", charHeads, charColors, selectedCategories, limitLines, linecount, count, parsedDivs, lastCharName, lastCategory, inputTexts, setSelectedCategories);
    });
    
    //ccfolia_log_getter 로 뽑았을시. 변환후 재동작
    Array.from(doc.querySelectorAll("#__tab__all div")).forEach((div) => {
      const p = document.createElement("p");
      p.innerHTML = div.innerHTML;
      div.parentNode.replaceChild(p, div);
      processMessageTag(p, "html", charHeads, charColors, selectedCategories, limitLines, linecount, count, parsedDivs, lastCharName, lastCategory, inputTexts, setSelectedCategories);
    });

    parsedDivs.push(endImagesHtml);
    
    return parsedDivs.length > 0 ? parsedDivs.join("") : "출력할 데이터가 없습니다.";;
  };

  const parseJson = (limitLines = true) => {
    if (!fileContent) return "파일을 업로드하세요.";
    if (!Array.isArray(fileContent)) return "올바른 JSON 형식이 아닙니다.";
  
    const parsedDivs = [];
    let count = { main: 0, info: 0, other: 0 };
    let lastCharName = null;
    let lastCategory = null;

    // const newCharHeads = { ...charHeads }; 
  
    parsedDivs.push(titleImagesHtml);

    fileContent.forEach((log) => {
      const fields = log.fields;
      if (!fields) return;
      const category = fields.channelName?.stringValue || "other";
      const charName = fields.name?.stringValue || "";
      const charColors = fields.color?.stringValue || "#000000";
      const text = fields.text?.stringValue || "";
      const dice_text = fields.extend?.mapValue?.fields?.roll?.mapValue?.fields?.result?.stringValue || ""
      const charHeads = fields.iconUrl?.stringValue || "";
      const p = document.createElement("p");

      // console.log(category);

      p.innerHTML = `
        <span>[${category}]</span> <span>${charName}</span> : <span> ${text+dice_text}</span>
      `;
  
      processMessageTag(p, "json", charHeads, charColors, selectedCategories, limitLines, linecount, count, parsedDivs, lastCharName, lastCategory, inputTexts, setSelectedCategories);
    });
  
    parsedDivs.push(endImagesHtml);

  
    return parsedDivs.length > 0 ? parsedDivs.join("") : "출력할 데이터가 없습니다.";
  };
  

  useEffect(() => {
    
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
        <UploadSection setFileContent={setFileContent} setFileName={setFileName} />
        <SettingsPanel 
        charColors={charColors}
        setCharColors={setCharColors}
        charHeads={charHeads}
        setCharHeads={setCharHeads}
        titleImages={titleImages}
        handleTitleImageChange={handleTitleImageChange} 
        setTitleImages={setTitleImages}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
      />
      
        <h4>04. 세션 제목 이미지 셋팅 <b>(*이미지 링크 사용. 쉼표 사용시 개행, 확장자까지 적어주세요.)</b></h4>
        <input type="text" placeholder="세션 제목 이미지 URL 입력란" className="title_input" 
          onChange={handleTitleImageChange} />

        <h4>05. 세션 엔딩 이미지 셋팅 <b>(*이미지 링크 사용. 쉼표 사용시 개행, 확장자까지 적어주세요.)</b></h4>
        <input type="text" placeholder="세션 엔딩 이미지 URL 입력란" className="end_input" 
          onChange={handleEndImageChange} />

        <h4>06. 시스템 스타일링 적용 캐릭터 이름 <b>(*main탭 한정, 입력한 캐릭터에게 적용(롤20 desc))</b></h4>
        <input type="text" placeholder="스타일링 적용 캐릭터 이름 입력란" className="system_input" 
          onChange={DescChange}/>

      </div>

      {/* 오른쪽 미리보기 패널 */}
      <PreviewPanel
        fileContent={fileContent}
        linecount={linecount}
        parseHtml={parseContent}
        charColors={charColors}
        charHeads={charHeads}
        titleImages={titleImages}
        selectedCategories={selectedCategories}
        onDownloadClick={onDownloadClick}
      />
      </div>
  );
}

export default App;
