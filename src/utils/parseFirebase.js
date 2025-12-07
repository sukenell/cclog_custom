// src/utils/parseFirebase.js
import { COCdice, getDiceTypes } from "../component/dice"; // 경로 프로젝트 구조에 맞춰 조정하세요

// options: { t, charHeads, charColors, tabColors, inputTexts, selectedCategories, diceEnabled, secretEnabled }
export function parseFirebaseMessages(fileContent, options = {}) {
  if (!fileContent || !Array.isArray(fileContent)) return [];

  const {
    t = (s) => s,
    charHeads = {},
    charColors = {},
    tabColors = {},
    inputTexts = [],
    selectedCategories = { main: true, info: false, other: false },
    diceEnabled = true,
    secretEnabled = false,
  } = options;

  const successTypes = getDiceTypes(t);

  const messages = [];
  let idx = 0;

  for (const log of fileContent) {
    const fields = log.fields;
    if (!fields) continue;

    const rawCategory = fields.channelName?.stringValue || "other";
    const category = String(rawCategory).toLowerCase();
    const charName = (fields.name?.stringValue === "" ? "NONAME" : fields.name?.stringValue) || "";
    const color = fields.color?.stringValue || charColors[charName] || "#dddddd";
    const text = (fields.text?.stringValue || "").replace(/\n/g, "\n");
    const dice_text = fields.extend?.mapValue?.fields?.roll?.mapValue?.fields?.result?.stringValue || "";
    const imgUrl = fields.iconUrl?.stringValue || charHeads[charName] || "";

    // background color logic (basic)
    let backgroundColor = "#3b3b3b";
    if (category === "other") backgroundColor = "#4c4c4c";
    else if (category === "info") backgroundColor = "#464646";
    if (tabColors?.[category]) backgroundColor = tabColors[category];

    const isDice = diceEnabled && COCdice.test((text + dice_text).trim());
    const isSecret = /^secret\(.+\)$/i.test(category) || (secretEnabled && category === "secret");

    // build message text (preserve some simple formatting)
    const plainText = (text + (dice_text ? ` ${dice_text}` : "")).trim();

    // detect dice result style (optional)
    let diceStyle = null;
    if (isDice) {
      for (const [key, style] of Object.entries(successTypes)) {
        if (plainText.includes(key)) {
          diceStyle = style;
          break;
        }
      }
    }

    messages.push({
      id: `${Date.now().toString(36)}_${idx++}`,
      category,
      charName,
      text: plainText,
      originalHTML: "", // not using HTML anymore
      imgUrl,
      backgroundColor,
      displayType: "flex",
      isDice,
      isSecret,
      diceStyle,
      color,
    });

  }

  return messages;
}
