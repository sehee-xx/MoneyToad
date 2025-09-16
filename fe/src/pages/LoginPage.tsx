import SsafyIcon from "../components/SsafyIcon";

function LoginPage() {
  const handleSsafyLogin = () => {
    window.location.href = `https://j13a409.p.ssafy.io/api/oauth2/authorization/ssafy`;
  };

  return (
    <div>
      <h1>로그인</h1>

      {/* SSAFY OAuth 로그인 */}
      <div style={{ display: "flex", marginBottom: "20px", justifyContent: "center" }}>
        <button
          type="button"
          onClick={handleSsafyLogin}
          style={{
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            padding: "12px 24px 12px 24px",
            borderRadius: "4px",
            fontSize: "16px",
            cursor: "pointer",
            width: "100%",
            maxWidth: "300px",
            // minWidth: "200px",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{
            position: "absolute",
            left: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center"
          }}>
            <SsafyIcon width={35} height={30} />
          </div>
          <span>SSAFY 로그인</span>
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
