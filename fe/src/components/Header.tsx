import { NavLink } from "react-router-dom";
import "./Header.css";

export default function Header() {
  // NOTE: '/leak/:month'는 실제 라우트가 아니면 404
  // 필요하면 아래처럼 동적 month를 써서 실제 경로로 바꿀 수 있음
  // const today = String(new Date().getMonth() + 1).padStart(2, "0");

  return (
    <header className="app-header">
      <nav className="nav">
        <NavLink to="/"          className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>마당</NavLink>
        <NavLink to="/leak/:month" className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>콩쥐의 장독대</NavLink>
        <NavLink to="/"  className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>콩쥐의 씀씀이</NavLink>
        <NavLink to="/"     className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>두꺼비의 조언</NavLink>
        <NavLink to="/"  className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>콩쥐의 곳간</NavLink>
      </nav>
    </header>
  );
}
