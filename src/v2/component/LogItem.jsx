import React, { useState, useEffect } from "react";
import { Pencil, Check, Image as ImageIcon } from "lucide-react";
import { COCdice, getDiceTypes } from "./dice";

export default function LogItem({
  message,
  t,
  updateMessage,
  diceEnabled,
  inputTexts = [],
  tabColorEnabled,
}) {
  const [isEditing, setEditing] = useState(false);
  const [isImgEditing, setImgEditing] = useState(false);
  const [text, setText] = useState(message.text);
  const [imgUrl, setImgUrl] = useState(message.imgUrl);

  useEffect(() => {
    setText(message.text);
  }, [message.text]);

  useEffect(() => {
    setImgUrl(message.imgUrl);
  }, [message.imgUrl]);

  const toggleEdit = () => {
    if (isImgEditing) setImgEditing(false); // 이미지 수정 중이면 종료

    if (isEditing) {
      updateMessage(message.id, { text });
    }
    setEditing(!isEditing);
  };

  const toggleImgEdit = () => {
    if (isEditing) setEditing(false); // 텍스트 수정 중이면 종료

    if (isImgEditing) {
      updateMessage(message.id, { imgUrl });
    }
    setImgEditing(!isImgEditing);
  };

  const handleImgError = (e) => {
    e.target.src = "https://ccfolia.com/blank.gif";
  };

  if (message.category === "image") {
    return (
      <div className="message-container image" style={{ padding: "24px 0", textAlign: "center" }}>
        <img
          src={imgUrl || "https://ccfolia.com/blank.gif"}
          alt=""
          style={{ maxWidth: "450px", width: "100%", margin: "0 auto" }}
          onError={handleImgError}
        />
        {/* 이미지 타입 메시지도 URL 수정 가능하게 할지? 요구사항엔 단락별 매핑이라고 했으니 프로필 이미지를 의미하는 듯. 일단 여기는 패스하거나 필요하면 추가. User said "단락별로 맵핑되어있는", mainly refers to character face. */}
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
    ? new Date(message.timestamp).toLocaleDateString('ja-JP')
    : "";

  const imgSrc = imgUrl || "https://ccfolia.com/blank.gif";
  const showGalleryAction = !isDice && renderType !== "other" && renderType !== "info" && renderType !== "desc";

  return (
    <div
      className={`gap message - container ${renderType} `}
      style={{
        backgroundColor:
          tabColorEnabled && message.backgroundColor
            ? message.backgroundColor
            : "transparent",
        padding: "12px 0",
        paddingLeft: renderType === "other" ? "48px" : "0",
        margin: renderType === "other" ? "8px" : "0",
        alignItems: "flex-start",
      }}
    >
      {/* ================= DESC ================= */}
      {renderType === "desc" ? (
        <div
          style={{
            width: "100%",
            textAlign: "center",
            fontStyle: "italic",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {isEditing ? (
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ width: "60%" }}
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
              <img src={imgSrc} alt="" onError={handleImgError} />
            </div>
          )}

          <div style={{ flex: 1 }}>
            {/* 이름 + 시간 */}
            {!isDice && renderType !== "other" && renderType !== "info" && (
              <div style={{ display: "flex", gap: "6px" }}>
                <strong className="msg-name" style={{ color: message.color }}>
                  {message.charName}
                </strong>

                <span className="msg-timestamp" style={{ color: "#999" }}>
                  {timestamp}
                </span>
                <span className="msg-category-tag" style={{ color: "#6c6c6cff" }}>
                  - {renderType}
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
              <>
                {/* ================= 일반 텍스트 (수정 모드 분기) ================= */}
                {isImgEditing ? (
                  /* --- 이미지 URL 수정 UI --- */
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#ccc", whiteSpace: "nowrap" }}>IMG :</span>
                    <input
                      value={imgUrl}
                      onChange={(e) => setImgUrl(e.target.value)}
                      style={{ width: "95%" }}
                      placeholder="Image URL..."
                    />
                    <button onClick={toggleImgEdit}>
                      <Check size={18} />
                    </button>
                  </div>
                ) : isEditing ? (
                  /* --- 텍스트 수정 UI --- */
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      style={{ width: "95%" }}
                    />
                    <button onClick={toggleEdit}>
                      <Check size={18} />
                    </button>
                  </div>
                ) : (
                  /* --- 기본 뷰 --- */
                  <>
                    {renderType === "info" && (
                      <div className="message-container">
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            background: "#4d4d4d",
                            borderRadius: "5px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ color: "#8d8d8d", fontSize: "14px" }}>
                            정보
                          </span>
                        </div>

                        <div
                          className="info"
                          style={{ display: "flex", alignItems: "center", gap: "6px" }}
                        >
                          <span style={{ paddingLeft: "16px", whiteSpace: "pre-line", }}>{text}</span>
                          {/* Info는 이미지 수정 X */}
                          <button onClick={toggleEdit}>
                            <Pencil size={18} />
                          </button>
                        </div>
                      </div>
                    )}

                    {renderType === "other" && (
                      <div
                        className="message-container other"
                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        <div className="other">
                          {message.charName} : {text}
                        </div>
                        {/* Other는 이미지 수정 X */}
                        <button onClick={toggleEdit}>
                          <Pencil size={18} />
                        </button>
                      </div>
                    )}

                    {renderType !== "info" && renderType !== "other" && (
                      <div
                        className="msg-normal-text"
                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        <span>{text}</span>

                        {showGalleryAction && (
                          <button onClick={toggleImgEdit} title="Change Image">
                            <ImageIcon size={18} />
                          </button>
                        )}
                        <button onClick={toggleEdit}>
                          <Pencil size={18} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

          </div>
        </>
      )}
    </div>
  );
}
