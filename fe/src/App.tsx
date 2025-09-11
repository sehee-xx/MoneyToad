// src/App.tsx
import { Routes, Route } from "react-router-dom";
import ScrollLandingPage from "./pages/ScrollLandingPage";
import LeakPotPage from "./pages/LeakPotPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ScrollLandingPage />} />
      <Route path="/leak" element={<LeakPotPage />} />
    </Routes>
  );
}
