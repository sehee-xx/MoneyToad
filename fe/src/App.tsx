import { Routes, Route, Link } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import MainPage from './pages/MainPage'

function App() {
  return (
    <>
      <nav>
        <Link to="/">홈</Link> | <Link to="/login">로그인</Link> | <Link to="/main">메인</Link>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/main" element={<MainPage />} />
      </Routes>
    </>
  )
}

export default App
