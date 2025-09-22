import { Routes, Route } from "react-router-dom";
import ScrollLandingPage from "./pages/ScrollLandingPage";
import LeakPotPage from "./pages/LeakPotPage";
import UserInfoInputPage from "./pages/UserInfoInputPage";
import ChartPage from "./pages/ChartPage";
import AuthCallback from "./pages/AuthCallback";
import Mypage from "./pages/Mypage";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ScrollLandingPage />} />
      <Route path="/userInfo" element={<UserInfoInputPage />} />
      <Route path="/pot/:month" element={<LeakPotPage />} />
      <Route path="chart" element={<ChartPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/mypage" element={<Mypage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
