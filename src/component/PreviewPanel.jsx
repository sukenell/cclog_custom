import EditItem from "./EditItem";

export default function PreviewPanel({ messages, updateMessage }) {
  return (
    <div className="preview-container">
{messages.map((msg) => (
  <EditItem
    key={msg.id}
    item={msg}
    onUpdate={(id, newValue) => updateMessage(id, { name: newValue })}
  />
))}
    </div>
  );
}
