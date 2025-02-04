import React, { useState, useEffect } from "react";

function App() {
  const linecount = 10;
  const [fileContent, setFileContent] = useState("");
  const [charColors, setCharColors] = useState({});
  const [charHeads, setCharHeads] = useState({});
  const [titleImages, setTitleImages] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState({ main: false, info: false, other: false });
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target.result);
      };
      reader.readAsText(file);
    }
  };
  const handleColorChange = (charName, color) => {
    setCharColors((prev) => ({ ...prev, [charName]: color }));
  };
  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };
  
  const handleHeadChange = (charName, url) => {
    setCharHeads((prev) => ({ ...prev, [charName]: url }));
  };

  const handleTitleImageChange = (event) => {
    const inputText = event.target.value;
    const urls = inputText.split(",").map(url => url.trim()).filter(url => url);
    setTitleImages(urls);
  };


  // 로그 파싱 함수
  const parseHtml = (limitLines = true) => {
    if (!fileContent) return "파일을 업로드하세요.";
    const parser = new DOMParser();
    const doc = parser.parseFromString(fileContent, "text/html");
    const parsedDivs = [];
    let count = { main: 0, info: 0, other: 0 };
    let lastCharName = null;
    let lastCategory = null;

    const titleImagesHtml = titleImages
      .map(
        (url) => `<img src="${url}" style="max-width: 100%; height: auto; margin-bottom: 10px; border-radius: 5px;">`
      )
      .join("");

    parsedDivs.push(titleImagesHtml);

    Array.from(doc.querySelectorAll("p")).forEach((p) => {
      const spans = p.getElementsByTagName("span");
      if (spans.length >= 2) {
        const category = spans[0].textContent.trim().replace(/\[|\]/g, "");
        const charName = spans[1].textContent.trim();
        spans[0].textContent ="";


        if ((!limitLines && selectedCategories[category])
          || (limitLines && selectedCategories[category] && count[category] < linecount)){
          p.style.color = category === "other" ? "gray" : "white";

          if (category !== "other" && charColors[charName]) {
            spans[1].style.color = charColors[charName];
            spans[1].style.fontWeight= 700;
            spans[2].style.fontWeight= 400;
            spans[2].style.wordBreak = "break-all";
            spans[2].style.overflowWrap = "anywhere";
          }

          const imgUrl = charHeads[charName] || ""; 
          let  imgTag = imgUrl
          ? `<img src="${imgUrl}" alt="${charName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 5px;">`
          : `<img style="width: 40px; border-radius: 5px;">`;

          if (lastCharName === charName && lastCategory === category) {
            spans[1].innerHTML = "";
            if (spans[1].nextSibling && spans[1].nextSibling.nodeType === 3) { 
              const nextText = spans[1].nextSibling.textContent.trim();
              if (nextText === ":") {
                spans[1].nextSibling.textContent = ""; 
                // imgTag = "";
              }
            }
          } else {
            lastCharName = charName;
            lastCategory = category;
          }
  
          const messageHtml = `
          <div style="display: flex; align-items: flex-start; gap: 10px;">
            ${imgTag ? `<div style="width: 40px; height: 40px; background: rgba(0, 0, 0, 0.2); border-radius: 5px; display: flex; align-items: center; justify-content: center;">${imgTag}</div>` : ""}
            ${p.outerHTML}
          </div>
          <hr style="border: 0; flex-shrink: 0; border-top: 1px solid rgba(255, 255, 255, 0.08);">
        `;
        parsedDivs.push(messageHtml);
        count[category]++;
        
        }
      }
    });

    return parsedDivs.length > 0 ? parsedDivs.join("") : "출력할 데이터가 없습니다.";;
  };


  // 파일 다운로드 기능
  const handleDownload = () => {
    const modifiedHtml = 
    `<html>
        <head>
          <style>
            body {
              background-color: #333333;
              padding: 20px;
              color: white;
              font-family: Arial, sans-serif;
            }
            hr {
              border: 0;
              border-top: 1px solid white;
              flex-shrink: 0;
              border-width: 0px 0px thin;
              border-style: solid;
              border-color: rgba(255, 255, 255, 0.08);
             }
              h3{
              margin: 50px 0 10px 0;
              }
          </style>
        </head>
        <body>
          ${parseHtml(false)}
        </body>
      </html>;`;
    const blob = new Blob([modifiedHtml], { type: "text/html" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "customized_log.html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    document.body.style.backgroundColor = "#333333";
    if (fileContent) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(fileContent, "text/html");
      const newCharColors = {};

      doc.querySelectorAll("p").forEach((p) => {
        const spans = p.getElementsByTagName("span");
        if (spans.length >= 2) {
          const charName = spans[1].textContent.trim();
          const rawColor = p.style.color || window.getComputedStyle(p).color;
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
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ width: "40%", padding: "20px", color: "white", background: "#222" }}>
        <h1>CCFolia 채팅 로그 커스텀</h1>
        <p>*커스텀 하지 않은 코코포리아 로그 외에는 인식하지 않습니다.</p>
        <input type="file" accept=".html" onChange={handleFileUpload} />
        
        <h4>포함 카테고리 선택</h4>
        {Object.keys(selectedCategories).map((category) => (
          <label key={category} style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={selectedCategories[category]}
              onChange={() => handleCategoryChange(category)}
            />
            {category}
          </label>
        ))}

        <h4>세션 제목 이미지 셋팅(확장자까지 적어주세요)</h4>
        <input
          type="text"
          placeholder="세션 제목 이미지 URL 입력"
          onChange={handleTitleImageChange}
          style={{
            marginTop: "5px",
            padding: "5px",
            width: "90%",
            textAlign: "center",
            borderRadius: "5px",
            border: "1px solid gray",
          }}
        />

    <h4>캐릭터 네임택 : 색 설정</h4>
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "5px",
      border: "2px solid white",
      padding: "10px",
      textAlign: "center",
      borderRadius: "10px", 
      maxHeight : "350px",
      overflowY : "auto",
    }}>
      {Object.keys(charColors).map((charName) => (
        <div key={charName} style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px",
          border: "1px solid white",
          borderRadius: "5px",
        }}>
          <span>{charName} : {""}</span>
          <input
            type="color"
            value={charColors[charName] || "#000000"}
            onChange={(e) => handleColorChange(charName, e.target.value)}
            style={{ height: "30px", cursor: "pointer" }}
          />
          <input
              type="text"
              placeholder="두상 URL"
              value={charHeads[charName] || ""}
              onChange={(e) => handleHeadChange(charName, e.target.value)}
              style={{
                marginTop: "5px",
                padding: "5px",
                width: "100%",
                textAlign: "center",
                borderRadius: "5px",
                border: "1px solid gray",
              }}
            />
        </div>
      ))}
    </div>

        {/* <h4>사담용 : 오너이름 변경</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          해당 기능은 개발 중입니다
        </div> */}

      </div>

      {/* 오른쪽 미리보기 패널 */}
      <div style={{ flex: 1, color: "white", position: "relative", overflow: "hidden", padding: "30px"}}>
        <h3 style={{ padding: "10px" }}>미리보기</h3>
        <p>*각 탭의 {linecount}줄의 내용을 아래와 같이 출력합니다.</p>
        <div style={{ overflowY: "auto", maxHeight: "calc(80vh - 60px)", padding: "10px" }}>
          <div dangerouslySetInnerHTML={{ __html: parseHtml() }} />
        </div>
        {fileContent && (
          <button
            onClick={handleDownload}
            style={{
              position: "absolute",
              bottom: "10px",
              width: "90%",
              padding: "10px 20px",
              background: "#484848",
              color: "white",
              border: "none",
              cursor: "pointer",
              borderRadius: "5px",
            }}
          >
            커스텀 로그 다운로드
          </button>
        )}
      </div>
    </div>
  );
}



export default App;
