import LogItem from "./LogItem";

export default function PreviewPanel({
  messages,
  updateMessage,
  selectedCategories,
  tabColors,
  diceEnabled,
  secretEnabled,
  inputTexts,
  titleImages,
}) {
  const filtered = messages.filter(
    (msg) => selectedCategories[msg.category] ?? true
  );

  return (
    <div className="preview-container">
      {filtered.map((msg, index) => (
        <div key={msg.id}>
          {/* 🔥 titleImages가 있으면 맵 오브젝트의 상단에 이미지 찍기 */}
          {titleImages?.length > 0 && (
            <img
              src={titleImages[index % titleImages.length]}
              alt=""
              style={{
                width: "100%",
                marginBottom: "10px",
                display: "block",
                borderRadius: "5px",
              }}
            />
          )}

          <LogItem
            message={msg}
            updateMessage={updateMessage}
            tabColors={tabColors}
            diceEnabled={diceEnabled}
            secretEnabled={secretEnabled}
            inputTexts={inputTexts}
          />
        </div>
      ))}
    </div>
  );
}
