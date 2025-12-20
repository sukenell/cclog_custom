import React, { useState, useEffect } from "react";
import { Pencil, Check } from "lucide-react";
import { COCdice, getDiceTypes } from "../component/dice";

export default function LogItem({
  message,
  updateMessage,
  diceEnabled,
  inputTexts = [],
  tabColorEnabled,
}) {
  const [isEditing, setEditing] = useState(false);
  const [text, setText] = useState(message.text);

  useEffect(() => {
    setText(message.text);
  }, [message.text]);

  const toggleEdit = () => {
    if (isEditing) {
      updateMessage(message.id, { text });
    }
    setEditing(!isEditing);
  };

  if (message.category === "image") {
    return (
      <div className="message-container image" style={{ padding: "24px 0", textAlign: "center" }}>
        <img
          src={message.imgUrl}
          alt=""
          style={{ maxWidth: "450px", width: "100%", margin: "0 auto" }}
        />
      </div>
    );
  }

  const isDesc =
    message.category === "main" &&
    Array.isArray(inputTexts) &&
    inputTexts.includes(message.charName);

  const renderType = isDesc ? "desc" : message.category;

  /* ================= dice ================= */
  const diceTypes = getDiceTypes();
  const isDice =
    message.category === "main" && diceEnabled && COCdice.test(text);

  let diceStyle = null;
  if (isDice) {
    for (const [key, style] of Object.entries(diceTypes)) {
      if (text.includes(key)) {
        diceStyle = style;
        break;
      }
    }
  }

  const timestamp = message.timestamp
    ? new Date(message.timestamp).toLocaleDateString()
    : "";

  const imgSrc = message.imgUrl || "https://ccfolia.com/blank.gif";

  return (
    <div
      className={`gap message-container ${renderType}`}
      style={{
        backgroundColor:
          tabColorEnabled && message.backgroundColor
            ? message.backgroundColor
            : "transparent",
        padding: "12px 0",
        paddingLeft: renderType === "other" ? "77px" : undefined,
        alignItems: "flex-start",
      }}
    >
      {/* ================= DESC ================= */}
      {renderType === "desc" ? (
        <div style={{ width: "100%", textAlign: "center", fontStyle: "italic" }}>
          {isEditing ? (
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ width: "90%" }}
            />
          ) : (
            <span>{text}</span>
          )}
          <button onClick={toggleEdit}>
            {isEditing ? <Check size={18} /> : <Pencil size={18} />}
          </button>
        </div>
      ) : (
        <>
          {/* ================= 이미지 ================= */}
          {renderType !== "other" && renderType !== "info" && !isDice && (
            <div className="msg_container">
              <img src={imgSrc} alt="" />
            </div>
          )}

          <div style={{ flex: 1 }}>
            {/* 이름 + 시간 */}
            {!isDice && renderType !== "other" && renderType !== "info" && (
              <div style={{ display: "flex", gap: "6px" }}>
                <strong style={{ color: message.color }}>
                  {message.charName}
                </strong>

                <span style={{ fontSize: "10px", color: "#999" }}>
                  {timestamp}
                </span>
              </div>
            )}

            {/* ================= DICE ================= */}
            {isDice && diceStyle ? (
              <div data-dice="true" style={{ textAlign: "center" }}>
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
                <span style={diceStyle}> {text}</span>
              </div>
            ) : (
              /* ================= 일반 텍스트 (🔥 여기 핵심) ================= */
              <>
                {isEditing ? (
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    style={{ width: "95%" }}
                  />
                ) : (
                  <span>
                    {renderType === "other"
                      ? `${message.charName} : ${text}`
                      : text}
                  </span>
                )}
              </>
            )}

            {/* 수정 버튼 (dice 제외) */}
            {!(diceEnabled && isDice && diceStyle) && (
              <button onClick={toggleEdit} style={{ float: "right" }}>
                {isEditing ? <Check size={18} /> : <Pencil size={18} />}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
