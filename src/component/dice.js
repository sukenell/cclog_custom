export const COCdice = /^(?:s?\d{1,10}D\d{1,10}\s+\(\d{1,10}D\d{1,10}\)\s*＞\s*\d+|CCB?(?:\([+-]\d+\))?<=\d+)/i;
export const DXDdice = /^(?:\(\d+\+\d+\)dx\s+\(\d{1,10}DX\d{1,10}\))$/i;
export const InSanedice = /^\d{1,10}D\d{1,10}>=\d+$/i;

  export const getDiceTypes = (t) => ({
    [t("dice_result.critical")]: { color: "#FFD700", fontSize: "15px", fontWeight: "bold", textShadow: "0 0 5px rgba(255, 215, 0, 0.8)" },
    [t("dice_result.extreme")]: { color: "#FFA500", fontSize: "15px", fontWeight: "bold" },
    [t("dice_result.amazing")]: { color: "#FFA500", fontSize: "15px", fontWeight: "bold" },
    [t("dice_result.hard")]: { color: "#1E90FF", fontSize: "15px", fontWeight: "bold" },
    [t("dice_result.regular")]: { color: "#32CD32", fontSize: "15px", fontWeight: "bold" },
    [t("dice_result.fumble")]: { color: "red", fontSize: "15px", fontWeight: "bold" },
    [t("dice_result.failure")]: { color: "#ff604e", fontSize: "15px", fontWeight: "bold" },
  });