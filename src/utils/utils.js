import { COCdice, getDiceTypes } from '../component/dice'

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
  const translateCategory = (category) => {
    const categoryMap = {
        "메인": "main",
        "정보": "info",
        "잡담": "other",
        "メイン" : "main",
        "情報": "info",
        "雑談": "other",
        "主要" : "main",
        "信息": "info",
        "闲聊": "other",
      };
    return categoryMap[category] ?? category;
  };
  
  export const processMessageTag = (p, type, t, charHeads, charColors, diceEnabled, setDiceEnabled, secretEnabled, setSecretEnabled,
     limitLines, count, parsedDivs, lastCharName, lastCategory, inputTexts, selectedCategories, setSelectedCategories) => {    
    
    const successTypes = getDiceTypes(t);
    const spans = p.getElementsByTagName("span");

    if (spans.length < 2) return;

    const category = translateCategory(spans[0].textContent.trim().replace(/\[|\]/g, "").toLowerCase());

    const charName = spans[1].textContent.trim();
    spans[0].textContent = "";

    if (!(category in selectedCategories)) {
        setSelectedCategories(prev => ({ ...prev, [category]: true }));
        count[category] = 0;
    }

    let imgTag = "";
    let backgroundColor = "transparent";
    let displayType = "flex";
    const imgUrl = (type === "json")? charHeads || "" : charHeads[charName] || "";

    // 스타일 및 UI 설정 함수
    const applyCategoryStyles = () => {
        p.style.color = category === "other" ? "gray" : category === "info" ? "#9d9d9d" : "#dddddd";
        if (category !== "other" && charColors) {
            spans[1].style.color = (type === "json") ? charColors : charColors[charName];
        }
    };

    const handleConsecutiveMessages = () => {
        if (lastCharName === charName && lastCategory === category && category !== "info") {
            spans[1].innerHTML = "";
            const nextText = spans[1].nextSibling?.textContent.trim();
            if (nextText === ":") {
                spans[1].nextSibling.textContent = "";
                p.style.paddingLeft = "95px";
            }
        } else {
            lastCharName = charName;
            lastCategory = category;
        }
    };

    const cleanUpText_first = () => {
        const firstTrim = spans[0].nextSibling?.textContent.trim();
        if (firstTrim === ":") {
            spans[0].nextSibling.textContent = "";
        }
    };

    const cleanUpText_second = () => {
        if (spans[1]) {
            const bTag = spans[1].parentNode.querySelector("b");
            if (bTag) {
                bTag.remove();
            }
            const firstTrim = spans[1].nextSibling?.textContent.trim();
            if (firstTrim === ":") {
                spans[1].nextSibling.textContent = "";
            }
        }
    };
    

    const cleanUpText_third = () => {
        let nextNode = spans[1]?.nextSibling;
        if (nextNode?.nodeType === Node.ELEMENT_NODE && nextNode.tagName === "B") {
            nextNode = nextNode.nextSibling;
        }
        if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
            const updatedText = nextNode.textContent.replace(/:/g, "<br>");
            const newSpan = document.createElement("span");
            newSpan.innerHTML = updatedText;
            nextNode.replaceWith(newSpan);
        }
    };
    



    applyCategoryStyles();
    handleConsecutiveMessages();
    cleanUpText_first();
    

    const secretPattern = new RegExp(`^${t('preview.secret')}\\(.+\\)$`);

    switch (true) {
        case category === "other":
            imgTag = "";
            backgroundColor = "#4c4c4c";
            p.style.paddingLeft = "48px";
            p.style.margin = "8px";

            if (spans[1]) {
                const bTag = spans[1].parentNode.querySelector("b");
                if (bTag) {
                    bTag.remove();
                }
            }
            break;
        case category === "info":
            imgTag = `<div style="width: 40px; height: 40px; background: #4d4d4d; border-radius: 5px; display: flex; align-items: center; justify-content: center;">
                        <span style="color: #8d8d8d; font-size: 14px;"> ${t('setting.info')} </span>
                      </div>`;
            backgroundColor = "#464646";
            spans[1].innerHTML = "";
            cleanUpText_second();
            break;
        case category === "main":
            //desc
            if (inputTexts.includes(spans[1].textContent)) {
                p.style.display = "flow-root";
                p.style.fontStyle = "italic";
                p.style.fontWeight = "bold";
                p.style.textAlign = "center";
                p.style.margin = "8px";
                spans[1].innerHTML = "";
                displayType = "flow-root";
                cleanUpText_second();
            } else if (diceEnabled && COCdice.test(spans[2].textContent.trim())){
            const dice_text = ` <span style=" background: black; color: white; display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold;text-align: center;bletter-spacing: -1px;">
            ${spans[1].innerText} - ${t('preview.judgment')} </span>`;
            p.style.paddingLeft = "0";
            spans[1].innerHTML = "";
            displayType = "flow-root"
            p.style.display = "flow-root";
            p.style.fontStyle = "italic";
            p.style.fontWeight = "bold";
            p.style.textAlign = "center";
            p.style.margin = "8px";
            cleanUpText_second();
            const text = spans[2].textContent.trim();

            //COC
            for (const [key, style] of Object.entries(successTypes)) {
              if (text.includes(key)) {
                Object.assign(spans[2].style, style);
                break;
              }
            }
            spans[2].insertAdjacentHTML("beforebegin", dice_text);
            } else {
              spans[1].style.fontWeight = "bold";
              imgTag = imgUrl
          ? `<img src="${imgUrl}" alt="${charName}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 5px;">`
          : `<img style="width: 40px; border-radius: 5px;">`;
            }
            cleanUpText_third();
            break;
        //비밀탭
        case secretPattern.test(category):
            const secret_txt = `
            <span style="background: #464646; color: white; display: inline-block; padding: 10px 9px; border-radius: 5px; font-size: 14px; text-align: center;">
            ${t('preview.secret')}  </span>`;
            if(secretEnabled){
                imgTag = imgUrl
                ? `<img src="${imgUrl}" alt="${charName}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 5px;">`
                : `<img style="width: 40px; border-radius: 5px;">`;} else {
                spans[0].insertAdjacentHTML("beforebegin", secret_txt+'&nbsp');
            }
            backgroundColor = "#525569";
            cleanUpText_third();
            break;
        default:
            if (spans.length >= 3 && category !== "other" && category !== "info") {
                backgroundColor = "#525569";
                if (COCdice.test(spans[2].textContent.trim())) {
                    const nextText = spans[1].nextSibling.textContent.trim();
                    if (nextText === ":") {
                      spans[1].nextSibling.textContent = "";
                    }
                    const diceText = `<span style="background: black; color: white; display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold;text-align: center;">
                                      ${spans[1].innerText} - ${t('preview.judgment')} </span>`;
                    p.style.paddingLeft = "0";
                    spans[1].innerHTML = "";
                    displayType = "flow-root";
                    p.style.display = "flow-root";
                    p.style.fontStyle = "italic";
                    p.style.fontWeight = "bold";
                    p.style.textAlign = "center";
                    spans[2].insertAdjacentHTML("beforebegin", diceText);

                    // 성공 유형 스타일 적용
                    const text = spans[2].textContent.trim();
                    for (const [key, style] of Object.entries(successTypes)) {
                        if (text.includes(key)) {
                            Object.assign(spans[2].style, style);
                            break;
                        }
                    }
                } else if(secretEnabled){
                    imgTag = imgUrl
                    ? `<img src="${imgUrl}" alt="${charName}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 5px;">`
                    : `<img style="width: 40px; border-radius: 5px;">`;}
                
            } else {
                spans[1].style.fontWeight = "bold";
                backgroundColor = "#3b3b3b";
                imgTag = imgUrl
                    ? `<img src="${imgUrl}" alt="${charName}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 5px;">`
                    : `<img style="width: 40px; border-radius: 5px;">`;
            }
            cleanUpText_third();
            break;
    }
    const messageHtml = `
    <div class="gap" style="display: ${displayType}; background-color: ${backgroundColor};">
        ${imgTag ? `<div class="msg_container">${imgTag}</div>` : ""}
        ${p.outerHTML}
    </div>
    <hr style="margin: 0; padding: 0; border: 0; flex-shrink: 0; border-top: 1px solid rgba(255, 255, 255, 0.08);">
    `;

    if ((!limitLines && selectedCategories[category]) || (limitLines && selectedCategories[category])) {
        parsedDivs.push(messageHtml);
        count[category]++;
    }
};


  
  