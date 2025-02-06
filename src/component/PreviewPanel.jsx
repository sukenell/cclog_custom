import React from "react";

const PreviewPanel = ({ fileContent, linecount, parseHtml, charColors, charHeads, titleImages, selectedCategories, onDownloadClick }) => {
  return (
    <div className="preview_panel">
      <h3>미리보기</h3>
      <p>*각 탭의 {linecount}줄의 내용을 아래와 같이 출력합니다.</p>
      <div dangerouslySetInnerHTML={{ __html: parseHtml(fileContent, charColors, charHeads, titleImages, selectedCategories) }} />

      <div className="download_pannel">
        {fileContent && (
          <>
            <button onClick={() => onDownloadClick("html")} className="down_btn">
              다운로드(HTML)
            </button>
            <button onClick={() => alert("PDF 기능은 개발 중입니다")} className="down_btn">
              다운로드(PDF)
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;
