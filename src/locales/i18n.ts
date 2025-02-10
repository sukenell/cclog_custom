
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import translationEN from "./en/translation.json";
import translationKO from "./ko/translation.json";
import translationJP from "./jp/translation.json";
import translationZH from "./zh/translation.json";


const resources = {

  ko: {
    translation: translationKO
  },
  en: {
    translation: translationEN
  },
  jp: {
    translation: translationJP
  },
  zh: {
    translation: translationZH
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ko",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;