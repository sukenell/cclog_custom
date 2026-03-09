import { COCdice } from "../../v2/component/dice";
import { buildEbookJson } from "../../v2/utils/exportEbookJson";
import { parseFirebaseMessages } from "../../v2/utils/parseFirebase";

const CATEGORY_MAP = {
  main: "main",
  info: "info",
  other: "other",
  메인: "main",
  정보: "info",
  잡담: "other",
  メイン: "main",
  情報: "info",
  雑談: "other",
  主要: "main",
  信息: "info",
  闲聊: "other",
};

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

function extractMessageText(node) {
  const clone = node.cloneNode(true);

  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));

  Array.from(clone.querySelectorAll("span"))
    .slice(0, 2)
    .forEach((span) => span.remove());

  clone.querySelectorAll("b").forEach((tag) => tag.remove());

  return clone.textContent.replace(/^\s*:\s*/, "").trim();
}

function extractTimestamp(node) {
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
    charHeads = {},
    charColors = {},
    diceEnabled = true,
    t = (key) => key,
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

  return [...Array.from(doc.querySelectorAll("p")), ...inlineTabNodes]
    .map((node, index) => {
      const spans = node.getElementsByTagName("span");
      if (spans.length < 2) return null;

      const category = normalizeCategory(spans[0].textContent, t);
      const charName = spans[1].textContent.trim() || "NONAME";
      const text = extractMessageText(node);
      const timestamp = extractTimestamp(node);

      return {
        id: `v1-html-${index}`,
        category,
        charName,
        text,
        imgUrl: charHeads[charName] || "",
        color: charColors[charName],
        isDice: category === "main" && diceEnabled && COCdice.test(text),
        timestamp,
      };
    })
    .filter(Boolean);
}

function toImageMessages(images = [], prefix = "image") {
  return images
    .filter(Boolean)
    .map((imgUrl, index) => ({
      id: `${prefix}-${index}`,
      category: "image",
      text: "",
      imgUrl,
    }));
}

function normalizeSelectedCategories(selectedCategories, t) {
  if (!selectedCategories) return selectedCategories;

  return Object.fromEntries(
    Object.entries(selectedCategories).map(([category, enabled]) => [
      normalizeCategory(category, t),
      enabled,
    ])
  );
}

export function buildV1EbookJson({
  fileContent,
  fileName = "",
  selectedCategories,
  inputTexts = [],
  charHeads = {},
  charColors = {},
  titleImages = [],
  endImages = [],
  diceEnabled = true,
  t = (key) => key,
} = {}) {
  const normalizedSelectedCategories = normalizeSelectedCategories(
    selectedCategories,
    t
  );

  const parsedMessages = Array.isArray(fileContent)
    ? parseFirebaseMessages(fileContent, {
        t,
        charHeads,
        charColors,
        diceEnabled,
      })
    : parseHtmlMessages(fileContent, {
        t,
        charHeads,
        charColors,
        diceEnabled,
      });

  return buildEbookJson({
    messages: [
      ...toImageMessages(titleImages, "title-image"),
      ...parsedMessages,
      ...toImageMessages(endImages, "end-image"),
    ],
    fileName,
    selectedCategories: normalizedSelectedCategories,
    inputTexts,
  });
}
