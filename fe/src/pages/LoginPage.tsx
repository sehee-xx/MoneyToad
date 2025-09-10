function LoginPage() {
  const handleSsafyLogin = () => {
    // TODO: SSAFY OAuth URL로 리다이렉트
    // window.location.href = 'SSAFY_OAUTH_URL';
    console.log('SSAFY 로그인 버튼 클릭됨');
  };

  return (
    <div>
      <h1>로그인</h1>
      
      {/* SSAFY OAuth 로그인 */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <button 
          type="button" 
          onClick={handleSsafyLogin}
          style={{ 
            backgroundColor: '#007bff', 
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer',
            width: '100%',
            maxWidth: '300px'
          }}
        >
          SSAFY 로그인
        </button>
      </div>

    </div>
  )
}

export default LoginPage