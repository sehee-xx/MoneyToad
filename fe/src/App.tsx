import { Routes, Route } from "react-router-dom";
import ScrollLandingPage from "./pages/ScrollLandingPage";
import LeakPotPage from "./pages/LeakPotPage";
import UserInfoInputPage from "./pages/UserInfoInputPage";
import ChartPage from "./pages/ChartPage";
import LoginPage from "./pages/LoginPage";
import AuthCallback from "./pages/AuthCallback";
import UserInfoPage from "./pages/UserInfoPage";
import Mypage from "./pages/Mypage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ScrollLandingPage />} />
      <Route path="/userInfo" element={<UserInfoInputPage />} />
      <Route path="/pot/:month" element={<LeakPotPage />} />
      <Route path="chart" element={<ChartPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/userInfo" element={<UserInfoPage />} />
      <Route path="/mypage" element={<Mypage />} />
    </Routes>
  );
}
