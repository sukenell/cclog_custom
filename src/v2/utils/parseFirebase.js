// src/utils/parseFirebaseMessages.js
import { COCdice, getDiceTypes } from "../component/dice";

const CATEGORY_MAP = {
  main: "main",
  메인: "main",
  info: "info",
  정보: "info",
  other: "other",
  잡담: "other",
  メイン: "main",
  情報: "info",
  雑談: "other",
  主要: "main",
  信息: "info",
  闲聊: "other",
};

const FIXED_CATEGORIES = ["main", "info", "other"];

export function parseFirebaseMessages(fileContent, options = {}) {
  if (!fileContent || !Array.isArray(fileContent)) return [];

  const {
    t = (s) => s,
    charHeads = {},
    charColors = {},
    tabColors = {},
    diceEnabled = true,
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
      else backgroundColor = "#313131";
    } else {
      backgroundColor = tabColors[category] || "#525569";
    }

    /* =========================
       Dice 판정
    ========================= */
    const isDice =
      category === "main" && diceEnabled && COCdice.test(fullText);
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
      id: `msg_${idx++}`,
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

function normalizeCategory(rawCategory = "", t = (key) => key) {
  const trimmed = String(rawCategory).replace(/\[|\]/g, "").trim();
  const lower = trimmed.toLowerCase();

  if (CATEGORY_MAP[trimmed]) return CATEGORY_MAP[trimmed];
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];

  const secretLabels = [
    t("preview.secret"),
    "secret",
    "비밀",
    "秘匿",
    "秘密",
  ]
    .filter(Boolean)
    .map((label) => String(label).toLowerCase());

  for (const label of secretLabels) {
    if (lower.startsWith(`${label}(`) && trimmed.endsWith(")")) {
      return `secret${trimmed.slice(label.length)}`.toLowerCase();
    }
  }

  return lower;
}

function extractHtmlMessageText(node) {
  const clone = node.cloneNode(true);

  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));

  Array.from(clone.querySelectorAll("span"))
    .slice(0, 2)
    .forEach((span) => span.remove());

  clone.querySelectorAll("b").forEach((tag) => tag.remove());

  return clone.textContent.replace(/^\s*:\s*/, "").trim();
}

function extractHtmlTimestamp(node) {
  const rawTimestamp = node.querySelector("b")?.textContent?.trim() || "";
  const normalized = rawTimestamp.replace(/^\s*-\s*/, "");

  if (!normalized || !/\d{1,2}:\d{2}/.test(normalized)) {
    return null;
  }

  const timestamp = normalized.replace(/\//g, "-");
  const parsed = new Date(timestamp);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseHtmlMessages(fileContent, options = {}) {
  if (!fileContent || typeof fileContent !== "string") return [];

  const {
    t = (s) => s,
    charHeads = {},
    charColors = {},
    tabColors = {},
    diceEnabled = true,
  } = options;

  const parser = new DOMParser();
  const doc = parser.parseFromString(fileContent, "text/html");
  const inlineTabNodes = Array.from(doc.querySelectorAll("#__tab__all div")).map(
    (div) => {
      const p = doc.createElement("p");
      p.innerHTML = div.innerHTML;
      return p;
    }
  );
  const successTypes = getDiceTypes(t);
  const messages = [];
  let idx = 0;

  for (const node of [...Array.from(doc.querySelectorAll("p")), ...inlineTabNodes]) {
    const spans = node.getElementsByTagName("span");
    if (spans.length < 2) continue;

    const category = normalizeCategory(spans[0].textContent, t);
    const charName = spans[1].textContent.trim() || "NONAME";
    const text = extractHtmlMessageText(node);
    const timestamp = extractHtmlTimestamp(node);

    let backgroundColor = "transparent";

    if (FIXED_CATEGORIES.includes(category)) {
      if (category === "info") backgroundColor = "#464646";
      else if (category === "other") backgroundColor = "#4c4c4c";
      else backgroundColor = "#313131";
    } else {
      backgroundColor = tabColors[category] || "#525569";
    }

    const isDice = category === "main" && diceEnabled && COCdice.test(text);
    let diceStyle = null;

    if (isDice) {
      for (const [key, style] of Object.entries(successTypes)) {
        if (text.includes(key)) {
          diceStyle = style;
          break;
        }
      }
    }

    messages.push({
      id: `html_${idx++}`,
      category,
      charName,
      text,
      imgUrl: charHeads[charName] || "https://ccfolia.com/blank.gif",
      color: charColors[charName],
      backgroundColor,
      isDice,
      diceStyle,
      timestamp,
    });
  }

  return messages;
}

export function parseLogContent(fileContent, options = {}) {
  if (Array.isArray(fileContent)) {
    return parseFirebaseMessages(fileContent, options);
  }

  if (typeof fileContent === "string") {
    return parseHtmlMessages(fileContent, options);
  }

  return [];
}
