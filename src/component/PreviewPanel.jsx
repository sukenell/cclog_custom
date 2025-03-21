import React from "react";

const PreviewPanel = ({ t, fileContent, parseHtml, charColors, charHeads, titleImages, selectedCategories, onDownloadClick, diceEnabled, secretEnabled }) => {
  return (
    <div className="preview_panel">
      <h3>{t("preview.preview")}</h3>
      <div dangerouslySetInnerHTML={{ __html: parseHtml(fileContent, charColors, charHeads, titleImages, selectedCategories) }} />
      <div className="download_pannel">
        {fileContent && (
          <>
            <button onClick={() => onDownloadClick("html")} className="down_btn">
            {t("preview.download_html")}
            </button>
            <button onClick={() => onDownloadClick("Tstory")} className="down_btn">
              다운로드(Tstory 백업용)
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;
