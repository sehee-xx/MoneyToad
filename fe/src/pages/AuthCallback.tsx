import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const ran = useRef(false); // StrictMode에서 이펙트 2회 실행 보호

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(search);
    const token = params.get("accessToken");

    if (!token) {
      console.error("No access token found in URL");
      navigate("/", { replace: true });
      return;
    }

    // 토큰 저장 (Zustand persist → localStorage)
    useAuthStore.getState().setAccessToken(token);

    const hasUserInfo = !!localStorage.getItem("userInfo");
    if (hasUserInfo) {
      const month = String(new Date().getMonth() + 1);
      navigate(`/pot/${month}`, { replace: true });
      return;
    }

    navigate("/userInfo", { replace: true });
  }, [navigate, search]);

  return null;
}
