import React, {useEffect, useMemo } from "react";
import "../App.css";
import "../styles/base.css";

const SettingsPanel = ({ t, charColors, setCharColors, charHeads, setCharHeads, selectedCategories, setSelectedCategories,
  diceEnabled, setDiceEnabled, secretEnabled, setSecretEnabled, titleImages, setTitleImages }) => {
  
    const categoryLabels = useMemo(() => ({
      main: t("setting.main"),
      info: t("setting.info"),
      other: t("setting.other"),
    }), [t]);

    useEffect(() => {
    }, [diceEnabled, secretEnabled]);

  // useEffect(() => {
  
  //   const resetCategories = Object.keys(categoryLabels).reduce((acc, key) => {
  //     acc[key] = selectedCategories[key] || false;
  //     return acc;
  //   }, {});

  //   if (JSON.stringify(selectedCategories) !== JSON.stringify(resetCategories)) {
  //     setSelectedCategories(resetCategories);
  //   }
  // }, [JSON.stringify(categoryLabels), diceEnabled, secretEnabled]);

  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) => ({ ...prev,
      [category]: !prev[category] }));
  };

  const toggles = [
    { id: "diceToggle", state: diceEnabled, setState: setDiceEnabled, label: "Dice 스타일링 적용" },
    { id: "secretToggle", state: secretEnabled, setState: setSecretEnabled, label: "기타 탭 스탠딩 적용" },
  ];

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

      {/* 체크박스. 주사위 체크 */}
      <div className="skinTypeCheck">
      <h4>03. 기타 스타일링 적용 여부</h4>
      <ul>
        {toggles.map(({ id, state, setState, label }) => (
          <li key={id}>
            <input
              type="checkbox"
              id={id}
              className="hidden"
              checked={state}
              onChange={() => setState((prev) => !prev)}
            />
            <label
              htmlFor={id}
              className={`relative w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                state ? "bg-blue-500" : "bg-gray-300"
              }`}
              style={{ cursor: "pointer" }}
            >
              <span className="mr-2">{label}</span>
            </label>
          </li>
        ))}
      </ul>

    </div>

      <h4>04. {t("setting.cha_color")}<b>(*{t("setting.warning_txt2")})</b></h4>
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
