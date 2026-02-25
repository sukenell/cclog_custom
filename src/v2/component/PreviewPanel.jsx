import React from "react";
import LogItem from "./LogItem";

export default function PreviewPanel({
  messages,
  updateMessage,
  selectedCategories,
  tabColors,
  charColors,
  charHeads,
  diceEnabled,
  secretEnabled,
  inputTexts,
  onExportHTML,
  onExportSplitHTML,
  onExportJSON,
  tabColorEnabled,
  globalFontPercent,
}) {

  const filtered = messages.filter(msg => {
  if (msg.category === "image") return true;

  return selectedCategories[msg.category];
});

const buttonStyle = {
  flex: 1,
  padding: "12px",
  color: "#eaeaea",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: "999px",
  cursor: "pointer",
};


  return (
    <div className="preview-wrapper" style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      <div
      id="preview-scroll-box"  
        className="preview-scroll-box"
        style={{
          flex: 1,
          overflowY: "auto",
          "--font-scale": String((globalFontPercent || 100) / 100),
          // padding: "10px 20px",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "6px",
          background: "#3d3d3dde",
        }}
      >

        {filtered.map((msg, idx) => (
        <React.Fragment key={msg.id} >
          <LogItem
            message={msg}
            updateMessage={updateMessage}
            tabColors={tabColors}
            charColors={charColors}
            charHeads={charHeads}
            diceEnabled={diceEnabled}
            secretEnabled={secretEnabled}
            inputTexts={inputTexts}
            tabColorEnabled={tabColorEnabled}
          />

          {idx < filtered.length - 1 && (
            <hr
              className="message-divider"
              style={{
                border: "0",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                margin: "0",
              }}
            />
          )}
        </React.Fragment>
))}

      </div>

      <div
        style={{
          marginTop: "15px",
          display: "flex",
          justifyContent: "space-between",
          padding: "0 5px",
        }}
      >
       {messages.length > 0 && (
  <div style={{ display: "flex", gap: "10px", width: "100%" }}>
    {/* 기존 */}
    <button
      onClick={onExportHTML}
      style={buttonStyle}
    >
      다운로드 (HTML)
    </button>

    {/* 신규 */}
    <button
      onClick={onExportSplitHTML}
      style={buttonStyle}
    >
      다운로드 (분할 HTML)
    </button>

    <button
      onClick={onExportJSON}
      style={buttonStyle}
    >
      다운로드 (JSON)
    </button>
  </div>
)}



      </div>

    </div>
  );
}
