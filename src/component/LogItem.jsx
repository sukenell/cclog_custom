import React, { useState } from "react";
import { Pencil, Check } from "lucide-react";

export default function LogItem({ message, updateMessage }) {
  const [isEditing, setEditing] = useState(false);
  const [text, setText] = useState(message.text);

  const toggleEdit = () => {
    if (isEditing) {
      updateMessage(message.id, { text });
    }
    setEditing(!isEditing);
  };

  return (
    <div className="log-item">
      {isEditing ? (
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      ) : (
        <span>{message.text}</span>
      )}

      <button onClick={toggleEdit}>
        {isEditing ? <Check size={18} /> : <Pencil size={18} />}
      </button>
    </div>
  );
}
