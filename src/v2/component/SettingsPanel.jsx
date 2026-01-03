import React, { useEffect, useMemo } from "react";
import "../../App.css";
import "../../core/styles/base.css";

const FIXED_CATEGORIES = ["main", "info", "other"];

const SettingsPanel = ({
  t,
  selectedCategories,
  setSelectedCategories,
  diceEnabled,
  setDiceEnabled,
  tabColorEnabled,
  setTabColorEnabled,
  tabColors,
  setTabColor,
  messages,
}) => {
  const categoryLabels = useMemo(
    () => ({
      main: t("setting.main"),
      info: t("setting.info"),
      other: t("setting.other"),
    }),
    [t]
  );

  /* =========================
     카테고리 자동 감지 (image 제외)
  ========================= */
  const detectedCategories = useMemo(() => {
    const set = new Set(Object.keys(selectedCategories));

    messages.forEach((msg) => {
      if (!msg?.category) return;
      if (msg.category === "image") return;
      set.add(msg.category);
    });

    return Array.from(set);
  }, [messages, selectedCategories]);

  /* =========================
     새 카테고리 자동 체크
  ========================= */
  useEffect(() => {
    setSelectedCategories((prev) => {
      const next = { ...prev };
      detectedCategories.forEach((cat) => {
        if (!(cat in next)) next[cat] = true;
      });
      return next;
    });
  }, [detectedCategories, setSelectedCategories]);

  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  return (
    <div>
      {/* =========================
          02. 출력 탭 선택
      ========================= */}
      <div className="skinTypeCheck">
        <h4>
          02. {t("setting.tab_select")}
          <b>(*{t("setting.multiple")})</b>
        </h4>

        <ul>
          {detectedCategories.map((category) => (
            <li key={category}>
              <input
                type="checkbox"
                id={`cat-${category}`}
                checked={selectedCategories[category] ?? true}
                onChange={() => handleCategoryChange(category)}
              />
              <label htmlFor={`cat-${category}`}>
                {categoryLabels[category] || category}
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* =========================
          03. 기타 스타일링
      ========================= */}
      <div className="skinTypeCheck">
        <h4>03. 기타 스타일링 적용 여부</h4>
        <ul>
          <li>
            <input
              type="checkbox"
              id="diceToggle"
              checked={diceEnabled}
              onChange={() => setDiceEnabled((v) => !v)}
            />
            <label htmlFor="diceToggle">Dice 스타일링 적용</label>
          </li>

          <li>
            <input
              type="checkbox"
              id="tabColorToggle"
              checked={tabColorEnabled}
              onChange={() => setTabColorEnabled((v) => !v)}
            />
            <label htmlFor="tabColorToggle">
              탭 별 컬러 지정 설정
            </label>
          </li>
        </ul>
      </div>

      {tabColorEnabled && (
  <div className="skinTypeCheck">
    <h4>탭 별 컬러 지정</h4>

    <ul>
      {detectedCategories
        .filter(
          (category) =>
            category &&
            !FIXED_CATEGORIES.includes(category)
        )
        .map((category) => (
          <li
            key={`color-${category}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "6px",
            }}
          >
            <span style={{ minWidth: "80px" }}>{category}</span>

            <input
              type="color"
              value={tabColors?.[category] || "#525569"}
              onChange={(e) =>
                setTabColor((prev) => ({
                  ...prev,
                  [category]: e.target.value,
                }))
              }
              style={{
                width: "40px",
                height: "20px",
                border: "none",
                padding: 0,
                background: "none",
                cursor: "pointer",
              }}
            />
          </li>
        ))}
    </ul>
  </div>
)}

    </div>
  );
};

export default SettingsPanel;
