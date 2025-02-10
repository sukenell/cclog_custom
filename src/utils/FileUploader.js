import React, { useState } from "react";
import { FIREBASE_BASE_URL, MESSAGES_QUERY } from "../config.js";

function FileUploader({ t, setFileContent, setFileName }) {
  const [roomNumber, setRoomNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];

    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        try {
          setFileContent(content);
        } catch (error) {
          alert(t("setting.file_type"));
        }
      };
      reader.readAsText(file);
    }
  };

  const fetchLog = async () => {
    if (!roomNumber.trim()) {
      alert(t("setting.input_plz"));
      return;
    }

    const roomId = roomNumber.startsWith("https://ccfolia.com/rooms/")
    ? roomNumber.replace("https://ccfolia.com/rooms/", "").trim()
    : roomNumber.trim();
        
    const url = `${FIREBASE_BASE_URL}${roomId}${MESSAGES_QUERY}`;
  
    setLoading(true);
    let allMessages = [];
  
    const fetchMessages = async (url) => {
      setLoading(true);
    
      try {
        let allMessages = [];
        let nextPageToken = "";
    
        do {
          const response = await fetch(url + (nextPageToken ? `&pageToken=${nextPageToken}` : ""));
          const data = await response.json();
    
          if (data.documents) {
            allMessages = [...allMessages, ...data.documents];
            nextPageToken = data.nextPageToken || null;
          } else {
            alert(t("setting.none_log"));
            return;
          }
        } while (nextPageToken);
    
        const sortedMessages = allMessages.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
    
        setFileContent(sortedMessages);
        setFileName(`${roomId}.html`);
      } catch (error) {
        console.error(t("setting.err_txt"), error);
        alert(t("setting.console_errer"));
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages(url);
  };
  
  return (
    <div>
      <div className="file_upload" style={{ display: "grid" }}>
        
        <input type="file" accept=".html" onChange={handleFileUpload} />

        <label className="room_number">
          {t("setting.room_input")}
          <input
            type="text"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
          />
          <button onClick={fetchLog} disabled={loading}>
            {loading ? t("setting.loading") : t("setting.ok")}
          </button>
        </label>
      </div>
    </div>
  );
}

export default FileUploader;
