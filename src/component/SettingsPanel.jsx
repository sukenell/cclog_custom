import React, { useEffect } from "react";
import "../App.css";
import "../styles/base.css";

const SettingsPanel = ({ t, charColors, setCharColors, charHeads, setCharHeads, selectedCategories, setSelectedCategories, titleImages, setTitleImages }) => {
  
  const categoryLabels = {
    main: t("setting.main"),
    info: t("setting.info"),
    other: t("setting.other"),
  };

  useEffect(() => {
    const resetCategories = Object.keys(categoryLabels).reduce((acc, key) => {
      acc[key] = selectedCategories[key] || false;
      return acc;
    }, {});
    setSelectedCategories(resetCategories);
  }, [Object.keys(categoryLabels).join(",")]);

  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <div>
      <div className="skinTypeCheck">
        <h4>02. {t("setting.tab_select")}<b>(*{t("setting.multiple")})</b></h4>
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
              <label htmlFor={category}>{categoryLabels[category] || category}</label>
            </li>
          ))}
        </ul>
      </div>

      <h4>03. {t("setting.cha_color")}<b>(*{t("setting.warning_txt2")})</b></h4>
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
              placeholder="URL"
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
