// App.tsx
import { Routes, Route } from "react-router-dom";
import ScrollLandingPage from "./pages/ScrollLandingPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<ScrollLandingPage />} />
    </Routes>
  );
}

export default App;
