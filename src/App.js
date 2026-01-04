import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import AppV1 from "./v1/AppV1";
import AppV2 from "./v2/AppV2";

const BASENAME = "/cclog_custom";

function VersionSelectPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "24px",
      }}
    >
      <Link to="/v1">
        <button style={{ background: "#000", color: "#fff", padding: "18px 32px" }}>
          Version 1
        </button>
      </Link>

      <Link to="/v2">
        <button style={{ background: "#fff", color: "#000", border: "2px solid #000", padding: "18px 32px" }}>
          Version 2
        </button>
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <Routes>
        <Route path="/" element={<VersionSelectPage />} />
        <Route path="/v1/*" element={<AppV1 />} />
        <Route path="/v2/*" element={<AppV2 />} />
      </Routes>
    </BrowserRouter>
  );
}
