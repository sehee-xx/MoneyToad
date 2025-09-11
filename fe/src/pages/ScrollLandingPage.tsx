// src/pages/ScrollLandingPage.tsx
import { useEffect, useRef, useState } from "react";

type Page = {
  id: number;
  title: string;
  description: string;
  backgroundImage: string;
};

export default function ScrollLandingPage() {
  const [currentPage, setCurrentPage] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartY = useRef(0);

  const pages: Page[] = [
    {
      id: 1,
      title: "콩쥐의 꿈",
      description:
        "콩쥐는 부자가 되고 싶었습니다.\n매일매일 가난한 생활에 지친 콩쥐는\n언젠가는 꼭 부자가 되어 행복하게 살고 싶다고 생각했어요.",
      backgroundImage: "/landing/landing1.png",
    },
    {
      id: 2,
      title: "두꺼비를 만나다",
      description:
        "그래서 마을에서 유명한 자산관리사 두꺼비를 찾아갔습니다.\n두꺼비 선생님은 콩쥐의 소비 습관을 분석하기 시작했어요",
      backgroundImage: "/landing/landing2.png",
    },
    {
      id: 3,
      title: "장독대의 비밀",
      description: `두꺼비 선생님은 콩쥐에게 말했습니다.\n"콩쥐야, 먼저 네 장독대의 누수를 막아야 한단다.\n새는 곳을 막지 않으면 아무리 많이 담아도 소용없어."`,
      backgroundImage: "/landing/landing3.png",
    },
    {
      id: 4,
      title: "콩쥐의 장독대",
      description:
        "과연 콩쥐가 장독대의 누수를 모두 막아\n마을 최고의 부자가 될 수 있을까요?",
      backgroundImage: "/landing/landing4.png",
    },
  ];

  const total = pages.length;

  const scrollToPage = (i: number) => {
    if (isScrolling) return;
    setIsScrolling(true);
    setCurrentPage(i);
    setTimeout(() => setIsScrolling(false), 700);
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isScrolling) return;
      if (e.deltaY > 0 && currentPage < total - 1) scrollToPage(currentPage + 1);
      else if (e.deltaY < 0 && currentPage > 0) scrollToPage(currentPage - 1);
    };
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (isScrolling) return;
      const diff = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(diff) > 50) {
        if (diff > 0 && currentPage < total - 1) scrollToPage(currentPage + 1);
        else if (diff < 0 && currentPage > 0) scrollToPage(currentPage - 1);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isScrolling) return;
      if (e.key === "ArrowDown" && currentPage < total - 1) scrollToPage(currentPage + 1);
      else if (e.key === "ArrowUp" && currentPage > 0) scrollToPage(currentPage - 1);
    };

    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      el.removeEventListener("wheel", handleWheel as any);
      el.removeEventListener("touchstart", handleTouchStart as any);
      el.removeEventListener("touchend", handleTouchEnd as any);
      window.removeEventListener("keydown", handleKeyDown as any);
    };
  }, [currentPage, isScrolling, total]);

  return (
    <div ref={containerRef} className="dk-landing">
      <button
        className="dk-login"
        onClick={() => alert("로그인 페이지로 이동")}
      >
        로그인
      </button>

      {/* 슬라이드 트랙 */}
      <div
        className="dk-track"
        style={{
          height: `${total * 100}vh`,
          transform: `translateY(-${currentPage * 100}vh)`,
        }}
      >
        {pages.map((p, i) => (
          <section
            key={p.id}
            className="dk-page"
            style={{ backgroundImage: `url(${p.backgroundImage})` }}
          >
            <div className="dk-overlay" />
            <div className={`dk-content ${currentPage === i ? "show" : ""}`}>
              <h1 className="dk-title">{p.title}</h1>
              <p className="dk-desc">{p.description}</p>
            </div>
          </section>
        ))}
      </div>

      {/* 네비게이션 점 */}
      <div className="dk-dots">
        {pages.map((_, i) => (
          <button
            key={i}
            className={`dk-dot ${currentPage === i ? "active" : ""}`}
            onClick={() => scrollToPage(i)}
            aria-label={`Go to page ${i + 1}`}
          />
        ))}
      </div>

      {/* 페이지 카운터 */}
      <div className="dk-counter">
        <span className="cur">{String(currentPage + 1).padStart(2, "0")}</span>
        <span className="sep">/</span>
        <span className="tot">{String(total).padStart(2, "0")}</span>
      </div>

      {/* 컴포넌트 자체 */}
      <style>{`
        /* 전역 보정 */
        html, body, #root { height: 100%; margin: 0; }
        body { overflow: hidden; } /* 바디 스크롤 잠금 */

        /* 폰트 */
        @font-face {
          font-family: 'Joseon100Years';
          src: url('https://gcore.jsdelivr.net/gh/projectnoonnu/noonfonts_2206-02@1.0/ChosunCentennial.woff2') format('woff2');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        .dk-landing {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          font-family: 'Joseon100Years', sans-serif;
          background: #000;
        }

        .dk-login {
          position: fixed;
          top: 24px;
          right: 32px;
          z-index: 30;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          padding: 10px 16px;
          border: none;
          cursor: pointer;
          transition: transform .2s ease, background .2s ease;
          background: none;
        }
        .dk-login:hover { background: rgba(255,255,255,0.25); transform: scale(1.04); border-radius: 10px }

        .dk-track {
          width: 100%;
          will-change: transform;
          transition: transform 700ms ease-in-out;
        }

        .dk-page {
          position: relative;
          width: 100%;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }

        .dk-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.55);
        }

        .dk-content {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 840px;
          padding: 0 24px;
          color: #fff;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity .7s ease, transform .7s ease;
        }
        .dk-content.show { opacity: 1; transform: translateY(0); }

        .dk-title {
          margin: 0 0 24px;
          font-weight: 800;
          line-height: 1.1;
          color: #fff;
          font-size: clamp(44px, 8vw, 96px);
          text-shadow: 0 6px 24px rgba(0,0,0,0.8);
        }
        .dk-desc {
          margin: 0 auto;
          max-width: 840px;
          white-space: pre-line;
          line-height: 1.6;
          color: rgba(255,255,255,0.95);
          font-size: clamp(16px, 2.2vw, 28px);
          text-shadow: 0 2px 8px rgba(0,0,0,0.6);
        }

        .dk-dots {
          position: fixed;
          right: 32px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 20;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dk-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.6);
          background: rgba(255,255,255,0.4);
          box-shadow: none;
          cursor: pointer;
          transition: transform .2s ease, background .2s ease, box-shadow .2s ease;
        }
        .dk-dot:hover { background: rgba(255,255,255,0.7); }
        .dk-dot.active {
          background: #fff;
          transform: scale(1.25);
          box-shadow: 0 0 10px rgba(0,0,0,0.3);
        }

        .dk-counter {
          position: fixed;
          left: 32px;
          bottom: 32px;
          z-index: 20;
          color: #fff;
          font-weight: 800;
          letter-spacing: .02em;
        }
        .dk-counter .cur { font-size: 22px; }
        .dk-counter .sep { margin: 0 8px; opacity: .7; }
        .dk-counter .tot { opacity: .85; }
      `}</style>
    </div>
  );
}
