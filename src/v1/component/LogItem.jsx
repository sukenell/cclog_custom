// import React, { useState, useEffect } from "react";
// import { Pencil, Check } from "lucide-react";
// import { COCdice, getDiceTypes } from "../../v2/component/dice";

// export default function LogItem({
//   message,
//   t,
//   updateMessage,
//   diceEnabled,
//   inputTexts = [],
//   tabColorEnabled,
// }) {
//   const [isEditing, setEditing] = useState(false);
//   const [text, setText] = useState(message.text);

//   useEffect(() => {
//     setText(message.text);
//   }, [message.text]);

//   const toggleEdit = () => {
//     if (isEditing) {
//       updateMessage(message.id, { text });
//     }
//     setEditing(!isEditing);
//   };

//   if (message.category === "image") {
//     return (
//       <div className="message-container image" style={{ padding: "24px 0", textAlign: "center" }}>
//         <img
//           src={message.imgUrl}
//           alt=""
//           style={{ maxWidth: "450px", width: "100%", margin: "0 auto" }}
//         />
//       </div>
//     );
//   }

//   const isDesc =
//     message.category === "main" &&
//     Array.isArray(inputTexts) &&
//     inputTexts.includes(message.charName);

//   const renderType = isDesc ? "desc" : message.category;

//   /* ================= dice ================= */
//   const diceTypes = getDiceTypes();
//   const isDice =
//     message.category === "main" && diceEnabled && COCdice.test(text);

//   let diceStyle = null;
//   if (isDice) {
//     for (const [key, style] of Object.entries(diceTypes)) {
//       if (text.includes(key)) {
//         diceStyle = style;
//         break;
//       }
//     }
//   }

//   const timestamp = message.timestamp
//     ? new Date(message.timestamp).toLocaleDateString('ja-JP')
//     : "";

//   const imgSrc = message.imgUrl || "https://ccfolia.com/blank.gif";

//   return (
//     <div
//       className={`gap message-container ${renderType}`}
//       style={{
//         backgroundColor:
//           tabColorEnabled && message.backgroundColor
//             ? message.backgroundColor
//             : "transparent",
//         padding: "12px 0",
//         paddingLeft: renderType === "other" ? "55px" : undefined,
//         alignItems: "flex-start",
//       }}
//     >
//       {/* ================= DESC ================= */}
//       {renderType === "desc" ? (
//         <div
//           style={{
//             width: "100%",
//             textAlign: "center",
//             fontStyle: "italic",
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//             gap: "6px",
//           }}
//         >
//           {isEditing ? (
//             <input
//               value={text}
//               onChange={(e) => setText(e.target.value)}
//               style={{ width: "60%" }}
//             />
//           ) : (
//             <span>{text}</span>
//           )}

//           <button onClick={toggleEdit}>
//             {isEditing ? <Check size={18} /> : <Pencil size={18} />}
//           </button>
//         </div>
//       ) : (
//         <>
//           {/* ================= 이미지 ================= */}
//           {renderType !== "other" && renderType !== "info" && !isDice && (
//             <div className="msg_container">
//               <img src={imgSrc} alt="" />
//             </div>
//           )}

//           <div style={{ flex: 1 }}>
//             {/* 이름 + 시간 */}
//             {!isDice && renderType !== "other" && renderType !== "info" && (
//               <div style={{ display: "flex", gap: "6px" }}>
//                 <strong style={{ color: message.color }}>
//                   {message.charName}
//                 </strong>

//                 <span style={{ color: "#999" }}>
//                   {timestamp}
//                 </span>
//                 <span style={{ color: "#6c6c6cff" }}>
//                   - {renderType}
//                 </span>
//               </div>
//             )}

//             {/* ================= DICE ================= */}
//             {isDice && diceStyle ? (
//               <div data-dice="true" style={{ textAlign: "center" }}>
//                 <div
//                   style={{
//                     display: "inline-block",
//                     background: "#000",
//                     color: "#fff",
//                     padding: "6px 14px",
//                     borderRadius: "20px",
//                     marginBottom: "6px",
//                   }}
//                 >
//                   {message.charName} - 판정
//                 </div>
//                 <span style={diceStyle}> {text}</span>
//               </div>
//             ) : (
//               <>
//                 {/* ================= 일반 텍스트 ================= */}
//                 {isEditing ? (
//                   <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
//                     <input
//                       value={text}
//                       onChange={(e) => setText(e.target.value)}
//                       style={{ width: "95%" }}
//                     />
//                     <button onClick={toggleEdit}>
//                       <Check size={18} />
//                     </button>
//                   </div>
//                 ) : (
//                   <>
//                     {renderType === "info" && (
//                       <div className="message-container">
//                         <div
//                           style={{
//                             width: "40px",
//                             height: "40px",
//                             background: "#4d4d4d",
//                             borderRadius: "5px",
//                             display: "flex",
//                             alignItems: "center",
//                             justifyContent: "center",
//                             flexShrink: 0,
//                           }}
//                         >
//                           <span style={{ color: "#8d8d8d", fontSize: "14px" }}>
//                             정보
//                           </span>
//                         </div>

//                         <div
//                           className="info"
//                           style={{ display: "flex", alignItems: "center", gap: "6px"}}
//                         >
//                           <span style={{ paddingLeft: "16px", whiteSpace: "pre-line", }}>{text}</span>
//                           <button onClick={toggleEdit}>
//                             <Pencil size={18} />
//                           </button>
//                         </div>
//                       </div>
//                     )}

//                     {renderType === "other" && (
//                       <div
//                         className="message-container other"
//                         style={{ display: "flex", alignItems: "center", gap: "6px" }}
//                       >
//                         <div className="other">
//                           {message.charName} : {text}
//                         </div>

//                         <button onClick={toggleEdit}>
//                           <Pencil size={18} />
//                         </button>
//                       </div>
//                     )}

//                     {renderType !== "info" && renderType !== "other" && (
//                       <div
//                         className="msg-normal-text"
//                         style={{ display: "flex", alignItems: "center", gap: "6px" }}
//                       >
//                         <span>{text}</span>

//                         <button onClick={toggleEdit}>
//                           <Pencil size={18} />
//                         </button>
//                       </div>
//                     )}
//                   </>
//                 )}
//               </>
//             )}

//             {/* 기존 dice 제외 버튼 제거 (이미 위에서 inline 처리) */}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }
