
import { COCdice, getDiceTypes } from "../component/dice";
export function parseFirebaseMessages(fileContent, options = {}) {
  if (!fileContent || !Array.isArray(fileContent)) return [];

  const {
    t = (s) => s,
    charHeads = {},
    charColors = {},
    tabColors = {},
    diceEnabled = true,
    // secretEnabled = false,
  } = options;

  const successTypes = getDiceTypes(t);
  const messages = [];
  let idx = 0;

  for (const log of fileContent) {
    const f = log.fields;
    if (!f) continue;

    const rawCategory = f.channelName?.stringValue || "other";
    const category = String(rawCategory).toLowerCase();

    const charName =
      f.name?.stringValue === "" ? "NONAME" : f.name?.stringValue || "";

    const color =
      f.color?.stringValue ||
      charColors[charName] ||
      "#dddddd";

    const text = f.text?.stringValue || "";
    const dice_text =
      f.extend?.mapValue?.fields?.roll?.mapValue?.fields?.result?.stringValue ||
      "";

    const fullText = `${text}${dice_text ? " " + dice_text : ""}`.trim();

    // 아이콘 URL (없으면 blank)
    const imgUrl =
      f.iconUrl?.stringValue ||
      charHeads[charName] ||
      "https://ccfolia.com/blank.gif";

    // timestamp (가능한 값 중 하나 사용)
    const timestamp =
      f.createdAt?.timestampValue || log.createTime || log.updateTime || null;

    // backgroundColor
    let backgroundColor =
      tabColors[category] ||
      (category === "info"
        ? "#454545"
        : category === "other"
        ? "gray"
        : "#313131"); // main 기본

    // dice 여부 / 스타일
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

    // const isSecret =
    //   category === "secret" ||
    //   /^secret\(.+\)$/.test(category) ||
    //   (secretEnabled && category === "secret");

    messages.push({
      id: `msg_${idx++}_${Date.now().toString(36)}`,
      category,
      charName,
      text: fullText,
      imgUrl,
      color,
      backgroundColor,
      isDice,
      diceStyle,
      // isSecret,
      timestamp,
    });
  }

  return messages;
}
