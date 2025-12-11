import React, { useState } from "react";
import { Pencil, Check } from "lucide-react";

export default function LogItem({ message, updateMessage, inputTexts }) {
  const [isEditing, setEditing] = useState(false);
  const [text, setText] = useState(message.text);

  // 시스템 캐릭터 여부
  const isSystem =
    Array.isArray(inputTexts) &&
    inputTexts.some((name) => name.trim() === message.charName);

  // 카테고리 → className 결정
  let className = "message-container";

  if (isSystem) {
    className += " desc";
  } else if (message.category === "other") {
    className += " other";
  } else if (message.category === "info") {
    className += " info";
  } else {
    className += " main";
  }

  // 이미지 URL
  const icon = message.imgUrl || "https://ccfolia.com/blank.gif";

  // timestamp formatting
  const formatTime = (ts) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      if (isNaN(d)) return "";
      return `${d.getFullYear()}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  const timestamp = formatTime(message.timestamp);

  const toggleEdit = () => {
    if (isEditing) updateMessage(message.id, { text });
    setEditing(!isEditing);
  };

  return (
    <>
      <div className={className}>

        {/* --- ① DESC 모드: 시스템 메시지는 텍스트만 출력 --- */}
        {isSystem ? (
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                  width: "100%",
                  padding: "4px",
                  background: "#2c2c2c",
                  border: "1px solid #555",
                  color: "white",
                  borderRadius: "4px",
                }}
              />
            ) : (
              <p>{message.text}</p>
            )}

            <button
              onClick={toggleEdit}
              style={{ background: "none", color: "white" }}
            >
              {isEditing ? <Check size={18} /> : <Pencil size={18} />}
            </button>
          </div>
        ) : (
          <>
            {/* --- ② 이미지 (other 제외) --- */}
            {message.category !== "other" && (
              <div className="msg_container">
                <img
                  src={icon}
                  alt="icon"
                  style={{
                    width: "40px",
                    height: "40px",
                    objectFit: "cover",
                    objectPosition: "top",
                    borderRadius: "0px", // 라운드 제거
                  }}
                />
              </div>
            )}

            {/* --- ③ 본문 --- */}
            <div style={{ flex: 1 }}>
              {/* charName + timestamp */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <b>{message.charName}</b>
                {timestamp && (
                  <span style={{ color: "gray", fontSize: "10pt" }}>
                    - {timestamp}
                  </span>
                )}
              </div>

              {/* message text */}
              {isEditing ? (
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "4px",
                    background: "#2c2c2c",
                    border: "1px solid #555",
                    color: "white",
                    borderRadius: "4px",
                  }}
                />
              ) : (
                <p>{message.text}</p>
              )}
            </div>

            {/* 수정 버튼 */}
            <button
              onClick={toggleEdit}
              style={{ background: "none", color: "white" }}
            >
              {isEditing ? <Check size={18} /> : <Pencil size={18} />}
            </button>
          </>
        )}
      </div>

      <hr className="message-divider" />
    </>
  );
}
