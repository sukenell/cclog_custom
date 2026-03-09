import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import PreviewPanel from "./PreviewPanel";

describe("PreviewPanel download actions", () => {
  test("does not render a json download button", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const rootApi = createRoot(container);
    const onDownloadClick = jest.fn();

    flushSync(() => {
      rootApi.render(
        <PreviewPanel
          t={(key) =>
            ({
              "preview.preview": "미리보기",
              "preview.download_html": "다운로드(HTML)",
              "preview.download_Tstory": "다운로드(Tstory 백업용)",
              "preview.download_json": "다운로드(JSON)",
            }[key] || key)
          }
          fileContent="<p></p>"
          parseHtml={() => ""}
          charColors={{}}
          charHeads={{}}
          titleImages={[]}
          selectedCategories={{ main: true }}
          onDownloadClick={onDownloadClick}
          diceEnabled={true}
          secretEnabled={false}
          tabColorEnabled={false}
          setTabColorEnabled={() => {}}
          tabColors={{}}
          setTabColor={() => {}}
        />
      );
    });

    const jsonButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "다운로드(JSON)"
    );

    expect(jsonButton).toBeUndefined();
    expect(onDownloadClick).not.toHaveBeenCalled();

    rootApi.unmount();
    container.remove();
  });
});
