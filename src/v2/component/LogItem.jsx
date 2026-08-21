import React, { useState, useEffect, useId, useRef } from "react";
import { Pencil, Check, Image as ImageIcon, Trash2 } from "lucide-react";
import { COCdice, getDiceTypes } from "./dice";
import StandingImageEditor from "./StandingImageEditor";

const BLANK_IMAGE_URL = "https://ccfolia.com/blank.gif";

const toCategoryClass = (value) =>
  String(value || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-");

const normalizeSpeakerName = (value) => String(value || "").trim();

export default function LogItem({
  message,
  t,
  updateMessage,
  onDeleteMessage,
  diceEnabled,
  inputTexts = [],
  tabColorEnabled,
  characterWardrobe,
  onApplyStandingVariant,
  onApplyStandingUrl,
  standingScopes = ["single", "all"],
}) {
  const [isEditing, setEditing] = useState(false);
  const [isImgEditing, setImgEditing] = useState(false);
  const [text, setText] = useState(message.text);
  const [imgUrl, setImgUrl] = useState(message.imgUrl);
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const [standingStatus, setStandingStatus] = useState("");
  const generatedEditorId = useId().replace(/:/g, "");
  const standingEditorId = `standing-image-editor-${generatedEditorId}`;
  const standingTriggerRef = useRef(null);
  const textInputRef = useRef(null);
  const wasImgEditing = useRef(false);

  useEffect(() => {
    setText(message.text);
  }, [message.text]);

  useEffect(() => {
    setImgUrl(message.imgUrl);
    setFailedImageUrl(null);
  }, [message.imgUrl]);

  useEffect(() => {
    if (
      wasImgEditing.current &&
      !isImgEditing &&
      standingTriggerRef.current
    ) {
      standingTriggerRef.current.focus();
    }
    wasImgEditing.current = isImgEditing;
  }, [isImgEditing]);

  useEffect(() => {
    if (isEditing) textInputRef.current?.focus();
  }, [isEditing]);

  const toggleEdit = () => {
    if (isImgEditing) setImgEditing(false); // 이미지 수정 중이면 종료

    if (isEditing) {
      updateMessage(message.id, { text });
    }
    setEditing(!isEditing);
  };

  const toggleImgEdit = () => {
    if (isEditing) setEditing(false); // 텍스트 수정 중이면 종료
    setStandingStatus("");
    setImgEditing((current) => !current);
  };

  const closeStandingEditor = () => {
    setStandingStatus("");
    setImgEditing(false);
  };

  const applyStandingVariant = ({ variantId, url, scope }) => {
    if (typeof onApplyStandingVariant === "function") {
      onApplyStandingVariant(message.id, variantId, url, scope);
    }
    setStandingStatus("이미지를 적용했습니다.");
    setImgEditing(false);
  };

  const applyStandingUrl = ({ url, scope }) => {
    if (typeof onApplyStandingUrl === "function") {
      onApplyStandingUrl(message.id, url, scope);
    }
    setStandingStatus("이미지를 적용했습니다.");
    setImgEditing(false);
  };

  const clearStandingImage = ({ scope }) => {
    if (typeof onApplyStandingUrl === "function") {
      onApplyStandingUrl(message.id, "", scope);
    }
    setStandingStatus("이미지를 비웠습니다.");
    setImgEditing(false);
  };

  const handleDelete = () => {
    if (typeof onDeleteMessage === "function") {
      onDeleteMessage(message.id);
    }
  };

  const renderDeleteButton = () => (
    <button
      type="button"
      onClick={handleDelete}
      title="Delete Message"
      aria-label="Delete Message"
    >
      <Trash2 size={18} />
    </button>
  );

  const requestedImgSrc = imgUrl || BLANK_IMAGE_URL;
  const hasImageError = failedImageUrl === requestedImgSrc;
  const previewImgSrc = hasImageError ? BLANK_IMAGE_URL : requestedImgSrc;

  const handleImgError = () => {
    if (requestedImgSrc !== BLANK_IMAGE_URL) {
      setFailedImageUrl(requestedImgSrc);
    }
  };

  if (message.category === "image") {
    return (
      <div
        className="message-container image"
        style={{
          padding: "24px 0",
          textAlign: "center",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <img
          src={previewImgSrc}
          data-export-src={hasImageError ? requestedImgSrc : undefined}
          alt=""
          style={{ maxWidth: "450px", width: "100%", margin: "0 auto" }}
          onError={handleImgError}
        />
        {renderDeleteButton()}
        {/* 이미지 타입 메시지도 URL 수정 가능하게 할지? 요구사항엔 단락별 매핑이라고 했으니 프로필 이미지를 의미하는 듯. 일단 여기는 패스하거나 필요하면 추가. User said "단락별로 맵핑되어있는", mainly refers to character face. */}
      </div>
    );
  }

  const normalizedInputTexts = Array.isArray(inputTexts)
    ? inputTexts.map(normalizeSpeakerName).filter(Boolean)
    : [];
  const isDesc = normalizedInputTexts.includes(normalizeSpeakerName(message.charName));

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

  const imgSrc = previewImgSrc;
  const showGalleryAction = !isDice && renderType !== "other" && renderType !== "info" && renderType !== "desc";
  const hasBackgroundColor = Boolean(tabColorEnabled && message.backgroundColor);
  const rowStyle = hasBackgroundColor
    ? { "--row-bg-color": message.backgroundColor }
    : undefined;
  const nameStyle = message.color
    ? { "--msg-name-color": message.color }
    : undefined;

  return (
    <div
      className={`gap message-row cat-${toCategoryClass(renderType)} ${renderType === "other" ? "message-row-other" : ""} ${hasBackgroundColor ? "message-row-has-bg" : ""}`}
      style={rowStyle}
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
              ref={textInputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ width: "60%" }}
              aria-label="Edit message text"
            />
          ) : (
            <span>{text}</span>
          )}

          <button
            type="button"
            onClick={toggleEdit}
            aria-label={isEditing ? "Save Message" : "Edit Message"}
          >
            {isEditing ? <Check size={18} /> : <Pencil size={18} />}
          </button>
          {!isEditing && renderDeleteButton()}
        </div>
      ) : (
        <>
          {/* ================= 이미지 ================= */}
          {renderType !== "other" && renderType !== "info" && !isDice && (
            <div className="msg_container">
              <img
                src={imgSrc}
                data-export-src={hasImageError ? requestedImgSrc : undefined}
                alt=""
                onError={handleImgError}
              />
            </div>
          )}

          <div className="message-body">
            {/* 이름 + 시간 */}
            {!isDice && renderType !== "other" && renderType !== "info" && (
              <div className="message-meta">
                <strong className="msg-name" style={nameStyle}>
                  {message.charName}
                </strong>

                <span className="msg-timestamp">
                  {timestamp}
                </span>
                <span className="msg-category-tag">
                  - {renderType}
                </span>
              </div>
            )}

            {/* ================= DICE ================= */}
            {isDice ? (
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
                {isEditing ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    <input
                      ref={textInputRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      style={{ width: "60%" }}
                      aria-label="Edit message text"
                    />
                    <button
                      type="button"
                      onClick={toggleEdit}
                      aria-label="Save Message"
                    >
                      <Check size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span style={diceStyle || undefined}> {text}</span>
                    <button type="button" onClick={toggleEdit} title="Edit Message" aria-label="Edit Message">
                      <Pencil size={18} />
                    </button>
                    {renderDeleteButton()}
                  </>
                )}
              </div>
            ) : (
              <>
                {/* ================= 일반 텍스트 (수정 모드 분기) ================= */}
                {isEditing ? (
                  /* --- 텍스트 수정 UI --- */
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      ref={textInputRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      style={{ width: "95%" }}
                      aria-label="Edit message text"
                    />
                    <button
                      type="button"
                      onClick={toggleEdit}
                      aria-label="Save Message"
                    >
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
                          <button
                            type="button"
                            onClick={toggleEdit}
                            aria-label="Edit Message"
                          >
                            <Pencil size={18} />
                          </button>
                          {renderDeleteButton()}
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
                        <button
                          type="button"
                          onClick={toggleEdit}
                          aria-label="Edit Message"
                        >
                          <Pencil size={18} />
                        </button>
                        {renderDeleteButton()}
                      </div>
                    )}

                    {renderType !== "info" && renderType !== "other" && (
                      <>
                        <div
                          className="msg-normal-text"
                          style={{ display: "flex", alignItems: "center", gap: "6px" }}
                        >
                          <span>{text}</span>

                          {showGalleryAction && (
                            <button
                              ref={standingTriggerRef}
                              type="button"
                              onClick={toggleImgEdit}
                              title="Change Image"
                              aria-label="Change Image"
                              aria-expanded={isImgEditing}
                              aria-controls={isImgEditing ? standingEditorId : undefined}
                            >
                              <ImageIcon size={18} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={toggleEdit}
                            aria-label="Edit Message"
                          >
                            <Pencil size={18} />
                          </button>
                          {renderDeleteButton()}
                        </div>
                        {isImgEditing && showGalleryAction && (
                          <StandingImageEditor
                            id={standingEditorId}
                            variants={characterWardrobe?.variants || []}
                            activeVariantId={characterWardrobe?.activeVariantId || null}
                            currentUrl={imgUrl || ""}
                            characterName={message.charName}
                            allowedScopes={standingScopes}
                            onApplyVariant={applyStandingVariant}
                            onApplyUrl={applyStandingUrl}
                            onClear={clearStandingImage}
                            onCancel={closeStandingEditor}
                            t={t}
                          />
                        )}
                        {standingStatus && (
                          <p
                            className="standing-image-editor-status"
                            role="status"
                            aria-live="polite"
                            data-export-ignore="true"
                          >
                            {standingStatus}
                          </p>
                        )}
                      </>
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
