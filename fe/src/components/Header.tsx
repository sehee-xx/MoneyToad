import { NavLink } from "react-router-dom";
import "./Header.css";

export default function Header() {
  // 항상 현재 달(1~12)로 이동
  const thisMonth = new Date().getMonth() + 1;   // 1..12
  const potPath = `/pot/${thisMonth}`;

  return (
    <header className="app-header">
      <nav className="nav">
        <NavLink to="/" className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>
          마당
        </NavLink>
        
        <NavLink to={potPath} className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>
          콩쥐의 장독대
        </NavLink>

        <NavLink to="/chart" className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>
          콩쥐의 씀씀이
        </NavLink>
        <NavLink to="/" className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>
          두꺼비의 조언
        </NavLink>
        <NavLink to="/mypage" className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>
          콩쥐의 곳간
        </NavLink>
      </nav>
    </header>
  );
}
