import jsPDF from "jspdf";

export function downloadFile(content, fileName) {
  const blob = new Blob([content], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const main_style = `

p{
  margin: 0;
}

b{
  color: gray;
    font-size: 9pt;
    font-weight: 200;
}

  span, b {
    font-size: 16px;
    font-family: 'Arial', sans-serif;
    line-height: 1.5;
  }

  b {
    font-weight: bold;
  }

.ccfolia_wrap {
  position: relative;
  padding: 10px !important;
  background-color: #2c2c2cde;
  color: #fefefe;
}
.msg_container {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.msg_container img {
width: 40px;
}

span:before {
  display: none !important ;
}
`;

const gap_style =`
.gap{
gap: 15px;
display: flex;
-webkit-box-pack: start;
justify-content: flex-start;
align-items: flex-start;
position: relative;
text-decoration: none;
width: 100%;
box-sizing: border-box;
text-align: left;
padding: 16px 16px;
}
`;



const T_gap_style =`
.gap{
gap: 15px;
display: flex;
-webkit-box-pack: start;
justify-content: flex-start;
align-items: flex-start;
position: relative;
text-decoration: none;
width: 100%;
box-sizing: border-box;
text-align: left;
padding: 16px 16px;
}
`;


export function downloadPDF(parseHtml, fileName, darkMode, chunkSize = 1000) {

  const content = parseHtml(darkMode);
  const chunks = splitContent(content, chunkSize);
  chunks.forEach((chunk, index) => {
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.width = "800px";
    tempDiv.style.padding = "20px";
    tempDiv.style.backgroundColor = darkMode ? "#2c2c2cde" : "white"
    tempDiv.style.color = darkMode ? "gray" : "black";
    tempDiv.style.fontFamily = "'Noto Sans KR', sans-serif";
    
    tempDiv.innerHTML = `
      <html>
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

          <style>
              ${main_style}
          </style>
        </head>
        <body>
          ${chunk}
        </body>
      </html>
    `;

    document.body.appendChild(tempDiv);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true
    });

    pdf.setFont("helvetica");

    const cleanFileName = fileName.replace(/\.[^/.]+$/, ""); 

    pdf.html(tempDiv, {
      callback: function (doc) {
        doc.save(`${cleanFileName}_part${index + 1}.pdf`);
        document.body.removeChild(tempDiv);
      },
      x: 10,
      y: 10,
      width: 190,
      windowWidth: tempDiv.scrollWidth
    });
  });
}

function splitContent(content, chunkSize) {
  const chunks = [];
  let currentIndex = 0;
  while (currentIndex < content.length) {
    chunks.push(content.slice(currentIndex, currentIndex + chunkSize));
    currentIndex += chunkSize;
  }
  return chunks;
}

export function handleDownload(parseHtml, fileName, type, darkMode) {
  if (type === "pdf") {
    downloadPDF(parseHtml, fileName, darkMode);
  } else {
    const modifiedHtml = `
    <html>
      <head>
      <meta charset="UTF-8">
        <style>
          ${main_style}
          ${type === "Tstory" ? T_gap_style : gap_style}
        </style>
      </head>
      <body>
        <div class="ccfolia_wrap">
          ${parseHtml(darkMode)}
        </div>
      </body>
    </html>`;

    const cleanFileName = fileName.replace(/\.[^/.]+$/, ""); 
    downloadFile(modifiedHtml, "custom_" + cleanFileName + ".html");
  }
}
