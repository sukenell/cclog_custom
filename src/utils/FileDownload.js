import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  // tempDiv.style.position = "absolute";
  // tempDiv.style.left = "-9999px";

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

  tempDiv.innerHTML = `
    <html>
      <head>
        <style>${style}</style>
      </head>
      <body>
        ${parseHtml(darkMode)}
      </body>
    </html>
  `;
  document.body.appendChild(tempDiv);

  html2canvas(tempDiv, { scale: 3, useCORS: true }).then((canvas) => {
    const imgData = canvas.toDataURL("image/png");

    // PDF 생성 - DPI 고려
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(fileName + ".pdf");

    document.body.removeChild(tempDiv);
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

    downloadFile(modifiedHtml, "custom_" + fileName);
  }
}
