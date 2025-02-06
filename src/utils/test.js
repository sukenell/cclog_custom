import { successTypes } from '../component/dice'


//C=
const COCdice = /^(?:s?\d{1,10}D\d{1,10}\s+\(\d{1,10}D\d{1,10}\)\s*＞\s*\d+|CC(?:\([+-]\d+\))?<=\d+)/i;
const DXDdice = /^(?:\(\d+\+\d+\)dx\s+\(\d{1,10}DX\d{1,10}\))$/i;
const InSanedice = /^\d{1,10}D\d{1,10}>=\d+$/i;

export const createImageSection = (images) => {
    if (!Array.isArray(images)) return "";
    return `
      <div style="text-align: center; margin-top: 30px;">
        ${images
          .map(
            (url) => `
            <img src="${url}" style="max-width: 100%; height: auto; border-radius: 5px;">
            <hr style="border: 0; flex-shrink: 0; border-top: 1px solid rgba(255, 255, 255, 0.08);">
            `
          )
          .join("")}
      </div>
    `;
  };

export const processMessageTag = (p, charHeads, charColors, selectedCategories, limitLines, linecount, count, parsedDivs, lastCharName, lastCategory, inputTexts, setSelectedCategories) => {
    const spans = p.getElementsByTagName("span");

      const category = spans[0].textContent.trim().replace(/\[|\]/g, "").toLowerCase();;
      const charName = spans[1].textContent.trim();
      spans[0].textContent = "";

      const imgUrl = charHeads[charName] || "";
      let imgTag = "";
      let backgroundColor = "";
      let displayType = "flex";

    if (!(category in selectedCategories)) {
      setSelectedCategories((prev) => ({
        ...prev,
        [category]: true,
      }));
  
      count[category] = 0;
    }

    //코코포 로그 외엔 동작하지 않도록 span 제한
    if (spans.length >= 2) {

      p.style.color = category === "other" ? "gray" : category === "info" ? "#9d9d9d" : "#dddddd";
      if (category !== "other" && charColors[charName]) {
        spans[1].style.color = charColors[charName];
      }
  
      if (lastCharName === charName && lastCategory === category && category !== "info") {
        spans[1].innerHTML = "";
        const nextText = spans[1].nextSibling?.textContent.trim();
        if (nextText === ":") {
          spans[1].nextSibling.textContent = "";
          imgTag = "";
          p.style.paddingLeft = "95px";
        }
      } else {
        lastCharName = charName;
        lastCategory = category;
      }

      //ccfolia_log_getter 로 뽑았을시.
      const firstTrim = spans[0].nextSibling?.textContent.trim();
        if (firstTrim === ":") {
          spans[0].nextSibling.textContent = "";
        }
      if (category === "other") {
        //사담탭
        imgTag = "";
        backgroundColor = "#4c4c4c";
        p.style.paddingLeft = "55px";

      } else if (category === "info") {
        //정보탭
        imgTag = `<div style="width: 40px; height: 40px; background: #4d4d4d; border-radius: 5px; display: flex; align-items: center; justify-content: center;">
                   <span style="color: #8d8d8d; font-size: 14px;"> 정보 </span>
                  </div>`;
        backgroundColor = "#464646";
        spans[1].innerHTML = "";
        const nextText = spans[1].nextSibling.textContent.trim();
        if (nextText === ":") {
          spans[1].nextSibling.textContent = "";
        }
      } else if (category === "main" && inputTexts.some(text => text === spans[1].textContent)) {
        //desc 문구 스타일링
        const nextText = spans[1].nextSibling.textContent.trim();
          if (nextText === ":") {
            spans[1].nextSibling.textContent = "";
          }
          spans[1].innerHTML = "";
          displayType = "flow-root"
          p.style.display = "flow-root";
          p.style.fontStyle = "italic";
          p.style.fontWeight = "bold";
          p.style.textAlign = "center";
      } else if((category !== "other" && category !== "info") && spans.length >= 3 ){
        //귓말
        if(category !== "main"){
          backgroundColor = "#525569";
        }
        if(COCdice.test(spans[2].textContent.trim())){
            //dice 스타일링 - COC
            const dice_text = ` <span style=" background: black; color: white; display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold;text-align: center;bletter-spacing: -1px;">
            ${spans[1].innerText} - 판정 </span>`;
            p.style.paddingLeft = "0";
            spans[1].innerHTML = "";
            displayType = "flow-root"
            p.style.display = "flow-root";
            p.style.fontStyle = "italic";
            p.style.fontWeight = "bold";
            p.style.textAlign = "center";
            const nextText = spans[1].nextSibling.textContent.trim();
            if (nextText === ":") {
              spans[1].nextSibling.textContent = "";
            }
            const text = spans[2].textContent.trim();

            //COC
            for (const [key, style] of Object.entries(successTypes)) {
              if (text.includes(key)) {
                Object.assign(spans[2].style, style);
                break;
              }
            }
            spans[2].insertAdjacentHTML("beforebegin", dice_text);

        }
      } else {
        //메인
        spans[1].style.fontWeight = "bold";
        backgroundColor = "#3b3b3b";
        imgTag = imgUrl
          ? `<img src="${imgUrl}" alt="${charName}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 5px;">`
          : `<img style="width: 40px; border-radius: 5px;">`;
      }
  
      const messageHtml = `
      <div style="display: ${displayType}; align-items: center; gap: 15px; padding: 0 20px; background-color: ${backgroundColor};">
        ${imgTag ? `<div style="width: 40px; height: 40px; background: rgba(0, 0, 0, 0.2); border-radius: 5px; display: flex; align-items: center; justify-content: center;">${imgTag}</div>` : ""}
        ${p.outerHTML}
      </div>
      <hr style="margin: 0; padding: 0; border: 0; flex-shrink: 0; border-top: 1px solid rgba(255, 255, 255, 0.08);">
    `;
  
      if ((!limitLines && selectedCategories[category]) || (limitLines && selectedCategories[category])) {
        parsedDivs.push(messageHtml);
        count[category]++;
      }
    }
  };
  
  