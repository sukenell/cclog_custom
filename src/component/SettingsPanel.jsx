import React, { useEffect, useMemo } from "react";
import "../App.css";
import "../styles/base.css";

const SettingsPanel = ({
  t,
  selectedCategories,
  setSelectedCategories,
  diceEnabled,
  setDiceEnabled,
  secretEnabled,
  setSecretEnabled,
  tabColorEnabled,
  setTabColorEnabled,
  tabColors,
  setTabColor,
  messages
}) => {
  // 기본 라벨 텍스트
  const categoryLabels = useMemo(
    () => ({
      main: t("setting.main"),
      info: t("setting.info"),
      other: t("setting.other")
    }),
    [t]
  );

  const excludeColorInput = ["main", "info", "other"];

  // 🔥 메시지 기반 category 자동 수집
  const detectedCategories = useMemo(() => {
    const set = new Set(Object.keys(selectedCategories)); // 기존것 유지

    messages?.forEach((msg) => {
      if (msg?.category) {
        set.add(msg.category);
      }
    });

    return Array.from(set);
  }, [messages, selectedCategories]);

  // 🔥 selectedCategories에 자동 추가 (ON으로)
  useEffect(() => {
    setSelectedCategories((prev) => {
      const updated = { ...prev };
      detectedCategories.forEach((cat) => {
        if (!(cat in updated)) {
          updated[cat] = true; // 새 탭은 기본 ON
        }
      });
      return updated;
    });
  }, [detectedCategories, setSelectedCategories]);

  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggles = [
    { id: "diceToggle", state: diceEnabled, setState: setDiceEnabled, label: "Dice 스타일링 적용" },
    { id: "secretToggle", state: secretEnabled, setState: setSecretEnabled, label: "비밀 메시지 활성화" },
    { id: "tabColorToggle", state: tabColorEnabled, setState: setTabColorEnabled, label: "탭 별 컬러 지정 설정" }
  ];

  return (
    <div>
      <div className="skinTypeCheck">
        <h4>02. {t("setting.tab_select")}<b>(*{t("setting.multiple")})</b></h4>

        <ul>
          {detectedCategories.map((category) => (
            <li key={category}>
              <input
                type="checkbox"
                id={category}
                checked={selectedCategories[category] ?? true}
                onChange={() => handleCategoryChange(category)}
              />
              <label htmlFor={category}>
                {categoryLabels[category] || category}
              </label>

              {tabColorEnabled && !excludeColorInput.includes(category) && (
                <input
                  type="color"
                  value={tabColors?.[category] || "#525569"}
                  style={{ width: "50%", height: "15px", border: "none", cursor: "pointer" }}
                  onChange={(e) =>
                    setTabColor((prev) => ({
                      ...prev,
                      [category]: e.target.value
                    }))
                  }
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* 토글 */}
      <div className="skinTypeCheck">
        <h4>03. 기타 스타일링 적용 여부</h4>
        <ul>
          {toggles.map(({ id, state, setState, label }) => (
            <li key={id}>
              <input
                type="checkbox"
                id={id}
                checked={state}
                onChange={() => setState((prev) => !prev)}
              />
              <label htmlFor={id}>{label}</label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SettingsPanel;
