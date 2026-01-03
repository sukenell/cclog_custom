// src/component/EditItem.js
import { useState } from "react";
import { Pencil, Check } from "lucide-react";

export default function EditItem({ item, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(item.text);

  const handleSave = () => {
    onUpdate(item.id, value);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between gap-2">
      {isEditing ? (
        <input
          className="border rounded px-2 py-1 text-sm flex-1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
      ) : (
        <span className="flex-1">{item.text}</span>
      )}

      <button
        onClick={() => {
          if (isEditing) handleSave();
          else setIsEditing(true);
        }}
        className="p-1"
      >
        {isEditing ? <Check size={18} /> : <Pencil size={18} />}
      </button>
    </div>
  );
}
