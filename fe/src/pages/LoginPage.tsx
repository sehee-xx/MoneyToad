function LoginPage() {
  return (
    <div>
      <h1>로그인</h1>
      <form>
        <div>
          <label>아이디:</label>
          <input type="text" placeholder="아이디를 입력하세요" />
        </div>
        <div>
          <label>비밀번호:</label>
          <input type="password" placeholder="비밀번호를 입력하세요" />
        </div>
        <button type="submit">로그인</button>
      </form>
    </div>
  )
}

export default LoginPage