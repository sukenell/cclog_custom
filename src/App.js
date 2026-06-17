import { BrowserRouter, Routes, Route } from "react-router-dom";
// import AppV1 from "./v1/AppV1";
import AppV2 from "./v2/AppV2";

const BASENAME = "/cclog_custom";

export default function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <Routes>
        <Route path="/" element={<AppV2 />} />
        {/* <Route path="/v1/*" element={<AppV1 />} /> */}
        <Route path="/v2/*" element={<AppV2 />} />
      </Routes>
    </BrowserRouter>
  );
}
