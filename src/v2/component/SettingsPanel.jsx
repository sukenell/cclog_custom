import React, { useEffect, useMemo } from "react";
import "../AppV2.css";
import "../../core/styles/base.css";

const FIXED_CATEGORIES = ["main", "info", "other"];

const translate = (t, key, fallback) => {
  if (typeof t !== "function") return fallback;

  const translated = t(key, { defaultValue: fallback });
  return typeof translated === "string" && translated.trim() && translated !== key
    ? translated
    : fallback;
};

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
      main: translate(t, "setting.main", "메인"),
      info: translate(t, "setting.info", "정보"),
      other: translate(t, "setting.other", "잡담"),
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
    const missingCategories = detectedCategories.filter(
      (cat) => !(cat in (selectedCategories || {}))
    );

    if (missingCategories.length === 0) return;

    setSelectedCategories((prev) => {
      const next = { ...prev };
      let changed = false;

      missingCategories.forEach((cat) => {
        if (!(cat in next)) {
          next[cat] = true;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [detectedCategories, selectedCategories, setSelectedCategories]);

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
      <section className="skinTypeCheck">
        <h3 id="category-settings-heading">
          02-1. {translate(t, "setting.tab_select", "출력 탭 선택")}
          <b>
            (*{translate(t, "setting.multiple", "중복 선택 가능")})
          </b>
        </h3>

        <div role="group" aria-labelledby="category-settings-heading">
          <ul>
            {detectedCategories.map((category) => {
              const categoryLabel = categoryLabels[category] || category;

              return (
                <li key={category}>
                  <input
                    type="checkbox"
                    id={`cat-${category}`}
                    checked={!!selectedCategories[category]}
                    onChange={() => handleCategoryChange(category)}
                  />
                  <label htmlFor={`cat-${category}`}>{categoryLabel}</label>

                  {!FIXED_CATEGORIES.includes(category) && tabColorEnabled && (
                    <input
                      type="color"
                      aria-label={translate(
                        t,
                        "setting.tab_color",
                        `${categoryLabel} 색상`
                      )}
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
                        height: "24px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* =========================
          03. 기타 스타일링
      ========================= */}
      <section className="skinTypeCheck">
        <h3 id="style-settings-heading">02-2. 기타 스타일링 적용 여부</h3>
        <div role="group" aria-labelledby="style-settings-heading">
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
      </section>

      <div className="skinTypeCheck">
        <h3>03. 텍스트 크기</h3>
        <div className="font-size-row">
          <span aria-hidden="true" className="font-size-sample-small">A</span>
          <input
            className="font-size-slider"
            type="range"
            min="80"
            max="160"
            step="1"
            value={globalFontPercent}
            onInput={(e) => setGlobalFontPercent(Number(e.currentTarget.value))}
            onChange={(e) => setGlobalFontPercent(Number(e.currentTarget.value))}
            aria-label="텍스트 크기 조절"
            aria-valuetext={`${globalFontPercent}%`}
          />
          <span aria-hidden="true" className="font-size-sample-large">A</span>
          <strong className="font-size-value">
            {globalFontPercent}%
          </strong>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
