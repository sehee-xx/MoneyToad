import "./LoadingOverlay.css";

const toad = "/loading/toad.png";   // 아까 올려주신 두꺼비 이미지 경로
const kong = "/loading/kongjwi.png";   // 아까 올려주신 콩쥐 이미지 경로

export default function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="loading-characters">
        <img src={toad} alt="두꺼비" className="character toad" />
        <img src={kong} alt="콩쥐" className="character kong" />
      </div>
      <p className="loading-text">로딩 중...</p>
    </div>
  );
}
