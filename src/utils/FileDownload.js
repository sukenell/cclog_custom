import jsPDF from "jspdf";
// import html2canvas from "html2canvas";
// import font from "./NotoSansCJK-Regular-normal.js";


export function downloadFile(content, fileName) {
  const blob = new Blob([content], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


export function downloadPDF(parseHtml, fileName, darkMode) {
  const tempDiv = document.createElement("div");
  tempDiv.style.position = "absolute";

  tempDiv.style.width = "800px";
  tempDiv.style.padding = "20px";
  // tempDiv.style.backgroundColor = darkMode ? "#2c2c2cde" : "white";
  tempDiv.style.color = darkMode ? "gray" : "black";
  tempDiv.style.fontFamily = "'Noto Sans KR', sans-serif";


  tempDiv.innerHTML = `
    <html>
      <head>
        <style>
        
        </style>
      </head>
      <body>
        ${parseHtml(darkMode)}
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
      doc.save("custom_" + cleanFileName + ".pdf");
      document.body.removeChild(tempDiv);
    },
    x: 10,
    y: 10,
    width: 190,
    windowWidth: tempDiv.scrollWidth
  });
}


export function handleDownload(parseHtml, fileName, type, darkMode) {
  if (type === "pdf") {
    downloadPDF(parseHtml, fileName, darkMode);
  } else {
    const style = darkMode ? `
      :root {
        --background-color: rgba(44, 44, 44, 0.87);
        --text-color: white;
      }
      body {
        background-color: var(--background-color);
        color: var(--text-color);
      }
    ` : `
      :root {
        --background-color: white;
        --text-color: black;
      }
      body {
        background-color: var(--background-color);
        color: var(--text-color);
      }
    `;

    const modifiedHtml = `
    <html>
      <head>
        <style>
          ${style}
        </style>
      </head>
      <body>
        ${parseHtml(darkMode)}
      </body>
    </html>`;

    const cleanFileName = fileName.replace(/\.[^/.]+$/, ""); 
    downloadFile(modifiedHtml, "custom_" + cleanFileName + ".html");
  }
}
