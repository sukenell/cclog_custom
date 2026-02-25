const DEFAULT_STANDING_URL = "https://ccfolia.com/blank.gif";

function stripExtension(fileName = "") {
  return String(fileName).replace(/\.[^/.]+$/, "") || "";
}

export function generate16DigitId() {
  const digits = [];

  // Prefer crypto when available for better randomness.
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(16);
    crypto.getRandomValues(arr);
    for (let i = 0; i < 16; i += 1) {
      digits.push(String(arr[i] % 10));
    }
    return digits.join("");
  }

  for (let i = 0; i < 16; i += 1) {
    digits.push(String(Math.floor(Math.random() * 10)));
  }
  return digits.join("");
}

export function formatKoreanTime(timestamp) {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function toSafeText(text = "") {
  return String(text)
    .replace(/[^0-9A-Za-z가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseDiceFromText(text = "") {
  const raw = String(text);

  const cocWithBonus = raw.match(/CC\(\s*[+-]\d+\s*\)\s*<=\s*(\d+)/i);
  const cocNormal = raw.match(/CC\s*<=\s*(\d+)/i);

  const success = cocWithBonus
    ? Number(cocWithBonus[1])
    : cocNormal
      ? Number(cocNormal[1])
      : null;

  const template = cocWithBonus ? "coc" : cocNormal ? "coc-1" : "";
  const rule = template ? "coc7" : "";

  const rollMatch = raw.match(/(?:굴림|roll)\s*[:：]?\s*(\d+)/i) || raw.match(/＞\s*(\d+)/);
  const roll = rollMatch ? Number(rollMatch[1]) : null;

  const bracketSkillMatch = raw.match(/\[\s*([^\]]+?)\s*\]/);
  const rollSkillMatch = raw.match(/^\s*([A-Za-z가-힣][A-Za-z가-힣0-9]*)\s+Roll/i);
  const skill = bracketSkillMatch
    ? bracketSkillMatch[1].trim()
    : rollSkillMatch
      ? rollSkillMatch[1]
      : "";

  return {
    source: "ccfolia",
    rule,
    template,
    inputs: {
      skill,
      roll,
      success,
    },
  };
}

export function mapRole(message) {
  if (message?.isDice) return "Dice";

  const category = message?.category;
  if (category === "main" || category === "info" || category === "other") {
    return category;
  }

  return "character";
}

function shouldIncludeMessage(message, selectedCategories) {
  if (!message) return false;
  if (message.category === "image") return true;
  if (!selectedCategories) return true;
  return Boolean(selectedCategories[message.category]);
}

function mapLine(message) {
  if (message.category === "image") {
    return {
      id: generate16DigitId(),
      speaker: "",
      role: "system",
      text: message.text || "",
      imageUrl: message.imgUrl || "",
    };
  }

  const line = {
    id: generate16DigitId(),
    speaker: message.charName || "NONAME",
    role: mapRole(message),
    timestamp: formatKoreanTime(message.timestamp),
    text: message.text || "",
    safetext: toSafeText(message.text || ""),
    input: {
      speakerImages: {
        standing: {
          url: message.imgUrl || DEFAULT_STANDING_URL,
        },
      },
    },
  };

  if (message.category === "other") {
    line.textColor = "color: #aaaaaa";
  }

  if (message.isDice) {
    line.input.dice = parseDiceFromText(message.text || "");
  }

  return line;
}

export function buildEbookJson({ messages = [], fileName = "", selectedCategories } = {}) {
  const lines = (Array.isArray(messages) ? messages : [])
    .filter((message) => shouldIncludeMessage(message, selectedCategories))
    .map((message) => mapLine(message));

  return {
    schemaVersion: 1,
    ebookView: {
      titlePage: {
        scenarioTitle: stripExtension(fileName),
        ruleType: "COC",
        gm: "",
        pl: "",
        writer: "",
        copyright: "",
        identifier: "",
        extraMetaItems: [],
      },
    },
    lines,
  };
}
