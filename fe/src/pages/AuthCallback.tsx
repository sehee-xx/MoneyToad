// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get(
      "accessToken"
    );

    if (token) {
      useAuthStore.getState().setAccessToken(token);

      navigate("/userInfo", { replace: true });
    }
  }, [navigate, location.pathname]);

  return null;
}
