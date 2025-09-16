// src/App.tsx
import { Routes, Route } from "react-router-dom";
import ScrollLandingPage from "./pages/ScrollLandingPage";
import LeakPotPage from "./pages/LeakPotPage";
import UserInfoInputPage from "./pages/UserInfoInputPage";
import ChartPage from "./pages/ChartPage";
import Mypage from "./pages/Mypage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ScrollLandingPage />} />
      <Route path="/userInfo" element={<UserInfoInputPage />} />
      <Route path="/pot/:month" element={<LeakPotPage />} />
      <Route path="chart" element={<ChartPage />} />
      <Route path="/mypage" element={<Mypage />} />
    </Routes>
  );
}
