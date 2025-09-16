import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      const token = new URLSearchParams(window.location.search).get(
        "accessToken"
      );

      if (!token) {
        console.error("No access token found in URL");
        navigate("/", { replace: true });
        return;
      }

      useAuthStore.getState().setAccessToken(token);

      const userInfo = localStorage.getItem("userInfo");

      if (userInfo) {
        const month = new Date().getMonth() + 1;
        navigate(`/pot/${month}`, { replace: true });
        return;
      }

      navigate("/userInfo", { replace: true });
    };

    handleAuth();
  }, [navigate]);

  return null;
}
