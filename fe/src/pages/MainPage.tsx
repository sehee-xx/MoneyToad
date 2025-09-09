import { useCounterStore } from "../store/counterStore";

function MainPage() {
  const { count, increment, decrement, reset } = useCounterStore();

  return (
    <div>
      <h1>메인 페이지</h1>
      <p>로그인 후 메인 페이지입니다.</p>

      <div
        style={{
          margin: "20px 0",
          padding: "20px",
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      >
        <h2>Zustand 카운터 예시</h2>
        <div style={{ fontSize: "24px", marginBottom: "10px" }}>
          현재 카운트: <strong>{count}</strong>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={increment} style={{ padding: "8px 16px" }}>
            증가 (+1)
          </button>
          <button onClick={decrement} style={{ padding: "8px 16px" }}>
            감소 (-1)
          </button>
          <button
            onClick={reset}
            style={{
              padding: "8px 16px",
              backgroundColor: "#ff6b6b",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            리셋
          </button>
        </div>
      </div>
    </div>
  );
}

export default MainPage;
