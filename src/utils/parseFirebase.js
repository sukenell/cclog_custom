import { COCdice, getDiceTypes } from "../component/dice";

export function parseFirebaseMessages(fileContent, options = {}) {
  if (!fileContent || !Array.isArray(fileContent)) return [];

  const {
    charHeads = {},
    charColors = {},
    tabColors = {},
    diceEnabled = true,
    secretEnabled = false,
  } = options;

  const successTypes = getDiceTypes();
  const messages = [];
  let idx = 0;

  for (const log of fileContent) {
    const f = log.fields;
    if (!f) continue;

    const category = (f.channelName?.stringValue || "other").toLowerCase();
    const charName =
      f.name?.stringValue === "" ? "NONAME" : f.name?.stringValue || "";

    const text = f.text?.stringValue || "";
    const dice_text =
      f.extend?.mapValue?.fields?.roll?.mapValue?.fields?.result?.stringValue ||
      "";

    let imgUrl =
      f.iconUrl?.stringValue || charHeads[charName] || "https://ccfolia.com/blank.gif";

    // timestamp
    const timestamp =
      f.createdAt?.timestampValue || log.createTime || log.updateTime || null;

    // backgroundColor
    let backgroundColor =
      tabColors[category] ||
      (category === "info"
        ? "#464646"
        : category === "other"
        ? "#4c4c4c"
        : "#3b3b3b");

    const fullText = `${text}${dice_text ? " " + dice_text : ""}`.trim();

    const isDice = diceEnabled && COCdice.test(fullText);
    const isSecret =
      category === "secret" ||
      /^secret\(.+\)$/.test(category) ||
      (secretEnabled && category === "secret");

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
      color: charColors[charName] || "#dddddd",
      backgroundColor,
      isDice,
      diceStyle,
      isSecret,
      timestamp,
    });
  }

  return messages;
}
