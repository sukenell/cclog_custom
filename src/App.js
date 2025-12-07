import React, { useState, useEffect } from "react";
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

  const [fileContent, setFileContent] = useState("");
  const [charColors, setCharColors] = useState({});
  const [charHeads, setCharHeads] = useState({});
  const [titleImages, setTitleImages] = useState([]);
  const [endImages, setEndImages] = useState([]);
  const [inputTexts, setInputTexts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState({ main: true, info: false, other: false });
  const [diceEnabled, setDiceEnabled] = useState(true);
  const [secretEnabled, setSecretEnabled] = useState(false);
  const [tabColorEnabled, setTabColorEnabled] = useState(false);
  const [TabColor, setTabColor] = useState({});
const [messages, setMessages] = useState([]);
  

  const handleTitleImageChange = (event) => {
    const urls = event.target.value.split(",").map((u) => u.trim()).filter((u) => u);
    setTitleImages(urls);
  };

  const handleEndImageChange = (event) => {
    const urls = event.target.value.split(",").map((u) => u.trim()).filter((u) => u);
    setEndImages(urls);
  };

  const DescChange = (event) => {
    setInputTexts(event.target.value.split(","));
  };

const updateMessage = (id, newValue) => {
  setMessages(prev =>
    prev.map(msg =>
      msg.id === id ? { ...msg, ...newValue } : msg
    )
  );
};



  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = main_style;
    document.head.appendChild(styleTag);
  }, []);


useEffect(() => {
  if (!fileContent || !fileContent.length) return;
  const parsedMessages = parseFirebaseMessages(fileContent);
  setMessages(parsedMessages);
}, [fileContent]);

  return (
    <div className="fix-layout">
      <div className="setting_container">
        <UploadSection setFileContent={setFileContent} t={t} />
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

        <h4>04. {t("setting.title_img")} <b>(*{t("setting.warning_txt3")})</b></h4>
        <input type="text" placeholder="URL" className="title_input" onChange={handleTitleImageChange} />

        <h4>05. {t("setting.end_img")} <b>(*{t("setting.warning_txt3")})</b></h4>
        <input type="text" placeholder="URL" className="end_input" onChange={handleEndImageChange} />

        <h4>06. {t("setting.system_cha")} <b>(*{t("setting.limit_txt")})</b></h4>
        <input type="text" placeholder="Name Input" className="system_input" onChange={DescChange} />
      </div>

      {/* <PreviewPanel
        t={t}
        messages={messages}
        charColors={charColors}
        charHeads={charHeads}
        titleImages={titleImages}
        updateMessage={updateMessage}
      /> */}

      <PreviewPanel messages={messages} updateMessage={updateMessage} />
    </div>
  );
}

export default App;
