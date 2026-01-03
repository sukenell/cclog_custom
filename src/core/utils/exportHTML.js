export function exportHTML(previewEl) {
  if (!previewEl) return;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>CCFolia Log</title>

<style>
${document.querySelector("style")?.innerHTML || ""}

/* 필요 시 base.css도 추가 */
</style>
</head>

<body>
<div class="ccfolia_wrap">
  ${previewEl.innerHTML}
</div>
</body>
</html>
`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "ccfolia_log.html";
  a.click();

  URL.revokeObjectURL(url);
}
