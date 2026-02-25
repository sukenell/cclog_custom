import React, { useEffect, useMemo } from "react";
import "../AppV2.css";
import "../../core/styles/base.css";

const FIXED_CATEGORIES = ["main", "info", "other"];

const SettingsPanel = ({
  t,

  // category
  selectedCategories,
  setSelectedCategories,
  messages,

  // toggles
  diceEnabled,
  setDiceEnabled,
  secretEnabled,
  setSecretEnabled,
  tabColorEnabled,
  setTabColorEnabled,

  // tab colors
  tabColors,
  setTabColor,
  globalFontPercent,
  setGlobalFontPercent,
}) => {
  /* =========================
     카테고리 라벨
  ========================= */
  const categoryLabels = useMemo(
    () => ({
      main: t("setting.main"),
      info: t("setting.info"),
      other: t("setting.other"),
    }),
    [t]
  );

  /* =========================
     메시지 기반 카테고리 자동 감지 (image 제외)
  ========================= */
  const detectedCategories = useMemo(() => {
    const set = new Set(Object.keys(selectedCategories || {}));

    messages?.forEach((msg) => {
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

  /* =========================
     핸들러
  ========================= */
  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const toggles = [
    {
      id: "diceToggle",
      state: diceEnabled,
      setState: setDiceEnabled,
      label: "Dice 스타일링 적용",
    },
  
    {
      id: "tabColorToggle",
      state: tabColorEnabled,
      setState: setTabColorEnabled,
      label: "탭 별 컬러 지정 설정",
    },
  ];

  /* =========================
     렌더
  ========================= */
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
                checked={!!selectedCategories[category]}
                onChange={() => handleCategoryChange(category)}
              />
              <label htmlFor={`cat-${category}`}>
                {categoryLabels[category] || category}
              </label>

              {!FIXED_CATEGORIES.includes(category) && tabColorEnabled && (
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
                    display: "block",
                    width: "60px",
                    height: "20px",
                    border: "none",
                    cursor: "pointer",
                  }}
                />
              )}
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
          {toggles.map(({ id, state, setState, label }) => (
            <li key={id}>
              <input
                type="checkbox"
                id={id}
                checked={state}
                onChange={() => setState((v) => !v)}
              />
              <label htmlFor={id}>{label}</label>
            </li>
          ))}
        </ul>
      </div>

      <div className="skinTypeCheck">
        <h4>04. 텍스트 크기</h4>
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginTop: "8px",
          }}
        >
          <span style={{ fontSize: "22px", lineHeight: 1, flexShrink: 0 }}>A</span>
          <input
            type="range"
            min="80"
            max="160"
            step="1"
            value={globalFontPercent}
            onInput={(e) => setGlobalFontPercent(Number(e.currentTarget.value))}
            onChange={(e) => setGlobalFontPercent(Number(e.currentTarget.value))}
            aria-label="텍스트 크기 조절"
            style={{
              flex: "1 1 auto",
              width: "100%",
              minWidth: "240px",
              margin: "0 6px",
              display: "block",
              visibility: "visible",
              opacity: 1,
              appearance: "auto",
              WebkitAppearance: "slider-horizontal",
              accentColor: "#cfd8ff",
              height: "24px",
              cursor: "pointer",
              background: "transparent",
            }}
          />
          <span style={{ fontSize: "34px", lineHeight: 1, flexShrink: 0 }}>A</span>
          <strong style={{ minWidth: "64px", textAlign: "right", flexShrink: 0 }}>
            {globalFontPercent}%
          </strong>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
