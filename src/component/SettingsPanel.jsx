import React from "react";
import "../App.css";
import "../styles/base.css";

const SettingsPanel = ({ charColors, setCharColors, charHeads, setCharHeads, selectedCategories, setSelectedCategories, titleImages, setTitleImages }) => {
  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };


  const handleTitleImageChange = (event) => {
    setTitleImages(event.target.value);
  };

  return (
    <div>
    <div className="skinTypeCheck">
      <h4>02. 출력 탭 선택<b>(*중복 선택 가능)</b></h4>
      <ul>
        {Object.keys(selectedCategories).map((category) => (
          <li key={category}>
            <input
              type="checkbox"
              id={category}
              value={category}
              checked={selectedCategories[category]}
              onChange={() => handleCategoryChange(category)}
            />
            <label htmlFor={category}>{category}</label>
          </li>
        ))}
      </ul>
    </div>

    <h4>03. 세션 제목 이미지</h4>
      <input 
        type="text"
        className="title_input"
        placeholder="세션 제목 이미지 URL (쉼표로 구분)" 
        value={titleImages} 
        onChange={handleTitleImageChange} 
      />

      <h4>06. 캐릭터 네임태그 색 설정</h4>
      <div className="color_div">
        {Object.keys(charColors).map((charName) => (
          <div key={charName} className="color_picker">
            <span>{charName} : </span>
            <input
              type="color"
              value={charColors[charName] || "#000000"}
              onChange={(e) => setCharColors((prev) => ({ ...prev, [charName]: e.target.value }))}
            />
            <input
              type="text"
              placeholder="두상 URL"
              value={charHeads[charName] || ""}
              onChange={(e) => setCharHeads((prev) => ({ ...prev, [charName]: e.target.value }))}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsPanel;
