// src/components/Header.tsx
import { NavLink } from "react-router-dom";
import { useEffect } from "react";

export default function Header() {
  // 이 컴포넌트 전용 스타일 주입
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-style", "app-header");
    styleEl.innerHTML = `
      .app-header {
        background: transparent;
        z-index: 100;
        padding: 20px 0;
      }
      .app-header .nav {
        display: flex;
        justify-content: center;
        gap: 50px;
        max-width: 1200px;
        margin: 0 auto;
      }
      .app-header .nav-item {
        color: #f5f5f4;
        text-decoration: none;
        padding: 30px 16px;
        font-weight: 500;
        font-size: 18px;
        transition: all 0.2s ease;
      }
      .app-header .nav-item:hover {
        color: #FFD400;
      }
      .app-header .nav-item.active {
        color: #FFD400;
      }
    `;
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, []);

  return (
    <header className="app-header">
      <nav className="nav">
        <NavLink to="/"          className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>마당</NavLink>
        <NavLink to="/leak/:month" className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>콩쥐의 장독대</NavLink>
        <NavLink to="/"    className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>두꺼비의 조언</NavLink>
        <NavLink to="/"  className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>콩쥐의 씀씀이</NavLink>
        <NavLink to="/"  className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>콩쥐의 곳간</NavLink>
      </nav>
    </header>
  );
}
