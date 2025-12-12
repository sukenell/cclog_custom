// src/component/LogItem.jsx
import React from "react";
import { COCdice, getDiceTypes } from "../component/dice";

const LogItem = React.memo(function LogItem({
  message,
  diceEnabled,
  inputTexts,
  tabColorEnabled,
}) {
  /* =========================
     이미지 오브젝트
  ========================= */
  if (message.category === "image") {
    return (
      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <img
          src={message.imgUrl}
          alt=""
          style={{ maxWidth: "800px", width: "100%" }}
        />
      </div>
    );
  }

  const isDesc = message.isDesc;
  const isDice =
    message.category === "main" &&
    diceEnabled &&
    COCdice.test(message.text);

  let diceStyle = null;
  if (isDice) {
    const diceTypes = getDiceTypes();
    for (const key in diceTypes) {
      if (message.text.includes(key)) {
        diceStyle = diceTypes[key];
        break;
      }
    }
  }

  return (
    <div
      className="message-container"
      style={{
        padding: "12px",
        background: tabColorEnabled ? message.bgColor : "transparent",
      }}
    >
      {isDesc ? (
        <div style={{ textAlign: "center", fontStyle: "italic", color: "#ccc" }}>
          {message.text}
        </div>
      ) : isDice && diceStyle ? (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              background: "#000",
              color: "#fff",
              padding: "6px 14px",
              borderRadius: "20px",
              marginBottom: "6px",
            }}
          >
            {message.charName} - 판정
          </div>
          <div style={diceStyle}>{message.text}</div>
        </div>
      ) : (
        <>
          <div style={{ color: "#bbb", fontSize: "12px" }}>
            {message.charName}
          </div>
          <div style={{ color: "#fff" }}>{message.text}</div>
        </>
      )}
    </div>
  );
});

export default LogItem;
