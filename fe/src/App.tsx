import { Routes, Route } from "react-router-dom";
import ScrollLandingPage from "./pages/ScrollLandingPage";
import LeakPotPage from "./pages/LeakPotPage";
import UserInfoInputPage from "./pages/UserInfoInputPage";
import ChartPage from "./pages/ChartPage";
import AuthCallback from "./pages/AuthCallback";
import Mypage from "./pages/Mypage";
import RouteGuard from "./components/RouteGuard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ScrollLandingPage />} />
      <Route path="/userInfo" element={<RouteGuard><UserInfoInputPage /></RouteGuard>} />
      <Route path="/pot/:month" element={<RouteGuard><LeakPotPage /></RouteGuard>} />
      <Route path="chart" element={<RouteGuard><ChartPage /></RouteGuard>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/mypage" element={<RouteGuard><Mypage /></RouteGuard>} />
    </Routes>
  );
}
