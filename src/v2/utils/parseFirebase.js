// src/utils/parseFirebaseMessages.js
import { COCdice, getDiceTypes } from "../component/dice";

const CATEGORY_MAP = {
  main: "main",
  메인: "main",
  info: "info",
  정보: "info",
  other: "other",
  잡담: "other",
};

const FIXED_CATEGORIES = ["main", "info", "other"];

export function parseFirebaseMessages(fileContent, options = {}) {
  if (!fileContent || !Array.isArray(fileContent)) return [];

  const {
    t = (s) => s,
    charHeads = {},
    charColors = {},
    tabColors = {},
  } = options;

  const successTypes = getDiceTypes(t);
  const messages = [];
  let idx = 0;

  for (const log of fileContent) {
    const f = log.fields;
    if (!f) continue;

    const rawCategory = f.channelName?.stringValue || "other";
    let category = String(rawCategory).toLowerCase();

    // 한글 카테고리 매핑 (메인 -> main, 정보 -> info, 잡담 -> other)
    if (CATEGORY_MAP[category]) {
      category = CATEGORY_MAP[category];
    }

    const charName =
      f.name?.stringValue === "" ? "NONAME" : f.name?.stringValue || "";

    const text = f.text?.stringValue || "";
    const diceText =
      f.extend?.mapValue?.fields?.roll?.mapValue?.fields?.result?.stringValue ||
      "";

    const fullText = `${text}${diceText ? " " + diceText : ""}`.trim();

    const imgUrl =
      f.iconUrl?.stringValue ||
      charHeads[charName] ||
      "https://ccfolia.com/blank.gif";

    const timestamp =
      f.createdAt?.timestampValue || log.createTime || log.updateTime || null;

    /* =========================
       backgroundColor 결정
    ========================= */
    let backgroundColor = "transparent";

    if (FIXED_CATEGORIES.includes(category)) {
      if (category === "info") backgroundColor = "#464646";
      else if (category === "other") backgroundColor = "#4c4c4c";
      else backgroundColor = "transparent";
    } else {
      backgroundColor = tabColors[category] || "#525569";
    }

    /* =========================
       Dice 판정
    ========================= */
    const isDice = COCdice.test(fullText);
    let diceStyle = null;

    if (isDice) {
      for (const [key, style] of Object.entries(successTypes)) {
        if (fullText.includes(key)) {
          diceStyle = style;
          break;
        }
      }
    }

    messages.push({
      id: `msg_${idx++}_${Date.now().toString(36)}`,
      category,
      charName,
      text: fullText,
      imgUrl,
      color: f.color?.stringValue || charColors[charName],
      backgroundColor,
      isDice,
      diceStyle,
      timestamp,
    });
  }

  return messages;
}
