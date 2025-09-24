import { useMemo, useState, useEffect } from "react";
import type { ReactNode } from "react";
import Header from "../components/Header";
import "./ToadAdvice.css";

const CATEGORY_ICONS: Record<string, string> = {
  식비: "/toadAdvice/eat.png",
  카페: "/toadAdvice/tea.png",
  "마트/편의점": "/toadAdvice/market.png",
  문화생활: "/toadAdvice/culture.png",
  "교통 / 차량": "/toadAdvice/transport.png",
  "패션 / 미용": "/toadAdvice/fashion.png",
  생활용품: "/toadAdvice/living.png",
  "주거 / 통신": "/toadAdvice/house.png",
  "건강 / 병원": "/toadAdvice/health.png",
  교육: "/toadAdvice/edu.png",
  "경조사 / 회비": "/toadAdvice/event.png",
  "보험 / 세금": "/toadAdvice/tax.png",
  기타: "/toadAdvice/etc.png",
};
const getCategoryImage = (category: string) =>
  CATEGORY_ICONS[category] ?? "/toadAdvice/etc.png";

export const toadAdviceAssets = [
  ...Object.values(CATEGORY_ICONS),
  "/toadAdvice/background.png",
  "/toadAdvice/angryToad.png",
  "/toadAdvice/happyToad.png",
  "/toadAdvice/total.png",
  "/toadAdvice/card.png",
];

const DUMMY = {
  fileId: "e96fbaf5-0989-4f39-bc15-57ef4ac0ade2",
  doojo: [
    {
      month: 8,
      year: 2025,
      categoriesCount: 13,
      categoriesPrediction: [
        {
          title: "건강 / 병원",
          min: 100,
          max: 200,
          current: 150,
          real: 120,
          result: false,
        },
        {
          title: "경조사 / 회비",
          min: 50,
          max: 100,
          current: 80,
          real: 90,
          result: true,
        },
        {
          title: "교육",
          min: 200,
          max: 300,
          current: 250,
          real: 260,
          result: true,
        },
        {
          title: "교통 / 차량",
          min: 150,
          max: 250,
          current: 200,
          real: 180,
          result: false,
        },
        {
          title: "기타",
          min: 100,
          max: 200,
          current: 150,
          real: 170,
          result: true,
        },
        {
          title: "마트/편의점",
          min: 300,
          max: 400,
          current: 350,
          real: 360,
          result: true,
        },
        {
          title: "문화생활",
          min: 100,
          max: 200,
          current: 150,
          real: 140,
          result: false,
        },
        {
          title: "보험 / 세금",
          min: 200,
          max: 300,
          current: 250,
          real: 240,
          result: false,
        },
        {
          title: "생활용품",
          min: 150,
          max: 250,
          current: 200,
          real: 220,
          result: true,
        },
        {
          title: "식비",
          min: 400,
          max: 500,
          current: 450,
          real: 480,
          result: true,
        },
        {
          title: "주거 / 통신",
          min: 300,
          max: 400,
          current: 350,
          real: 330,
          result: false,
        },
        {
          title: "카페",
          min: 100,
          max: 200,
          current: 150,
          real: 160,
          result: true,
        },
        {
          title: "패션 / 미용",
          min: 150,
          max: 250,
          current: 200,
          real: 210,
          result: true,
        },
      ],
    },
  ],
};

// const DUMMY_NO_ADVICE = {
//   fileId: "78f1b6b8-9b1d-4f83-8e57-0a7a6c3c0fa2",
//   doojo: [
//     {
//       month: 8,
//       year: 2025,
//       categoriesCount: 13,
//       categoriesPrediction: [
//         {
//           title: "건강 / 병원",
//           min: 100,
//           max: 200,
//           current: 150,
//           real: 120,
//           result: false,
//         },
//         {
//           title: "경조사 / 회비",
//           min: 50,
//           max: 100,
//           current: 80,
//           real: 70,
//           result: false,
//         },
//         {
//           title: "교육",
//           min: 200,
//           max: 300,
//           current: 250,
//           real: 230,
//           result: false,
//         },
//         {
//           title: "교통 / 차량",
//           min: 150,
//           max: 250,
//           current: 200,
//           real: 180,
//           result: false,
//         },
//         {
//           title: "기타",
//           min: 100,
//           max: 200,
//           current: 150,
//           real: 130,
//           result: false,
//         },
//         {
//           title: "마트/편의점",
//           min: 300,
//           max: 400,
//           current: 350,
//           real: 320,
//           result: false,
//         },
//         {
//           title: "문화생활",
//           min: 100,
//           max: 200,
//           current: 150,
//           real: 140,
//           result: false,
//         },
//         {
//           title: "보험 / 세금",
//           min: 200,
//           max: 300,
//           current: 250,
//           real: 240,
//           result: false,
//         },
//         {
//           title: "생활용품",
//           min: 150,
//           max: 250,
//           current: 200,
//           real: 190,
//           result: false,
//         },
//         {
//           title: "식비",
//           min: 400,
//           max: 500,
//           current: 450,
//           real: 430,
//           result: false,
//         },
//         {
//           title: "주거 / 통신",
//           min: 300,
//           max: 400,
//           current: 350,
//           real: 330,
//           result: false,
//         },
//         {
//           title: "카페",
//           min: 100,
//           max: 200,
//           current: 150,
//           real: 140,
//           result: false,
//         },
//         {
//           title: "패션 / 미용",
//           min: 150,
//           max: 250,
//           current: 200,
//           real: 180,
//           result: false,
//         },
//       ],
//     },
//   ],
// };

// 두꺼비 말풍선 멘트들
const TOAD_QUOTES = [
  "지출을 확인해보겠소!",
  "흠... 이건 좀 과하지 않소?",
  "돈 관리의 지혜를 전수하겠소!",
  "절약이 답이오!",
  "현명한 소비를 하시오!",
];

// 유틸 함수들
const highlightNumbers = (text: string): ReactNode[] => {
  const re = /\d[\d,]*(?:\.\d+)?(?:%|원|냥)?/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <span key={parts.length} className="highlight-number">
        {m[0]}
      </span>
    );
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};

const won = (n: number) =>
  new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(n) + "냥";

const estimateAvg = (min: number, max: number) => (min + max) / 2;

export default function ToadAdvice() {
  // 조언 더미 데이터를 기본으로 사용 (데모용)
  const sheet = DUMMY.doojo[0];
  // const sheet = DUMMY_NO_ADVICE.doojo[0];

  const [currentQuote, setCurrentQuote] = useState(0);
  const [showQuote, setShowQuote] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const preds = sheet.categoriesPrediction;

  const advices = useMemo(() => {
    return preds
      .filter((v) => v.result)
      .map((v) => {
        const avg = estimateAvg(v.min, v.max);
        const pct = avg > 0 ? ((v.real - avg) / avg) * 100 : 0;
        const over = Math.max(0, v.real - v.current);
        const detail =
          `'${v.title}'의 누수 기준액이 ${won(v.current)}인데\n실제로 ${won(
            v.real
          )} 만큼 썼고\n` +
          `12개월 평균치보다 약 ${pct.toFixed(1)}% 높다고 판단해\n${won(
            over
          )} 만큼의 과소비가 발생했소!`;
        return { id: v.title, category: v.title, detail, over, pct };
      })
      .sort((a, b) => b.over - a.over); // 과소비 금액순으로 정렬
  }, [preds]);

  const [open, setOpen] = useState<null | {
    id: string;
    title: string;
    detail: string;
    over: number;
  }>(null);
  const hasAdvice = advices.length > 0;

  // 두꺼비 말풍선 애니메이션
  useEffect(() => {
    if (hasAdvice) {
      const interval = setInterval(() => {
        setShowQuote(true);
        setCurrentQuote((prev) => (prev + 1) % TOAD_QUOTES.length);
        setTimeout(() => setShowQuote(false), 3000);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [hasAdvice]);

  return (
    <div className={`toad-advice-container ${!hasAdvice ? "no-scroll" : ""}`}>
      {/* 메인 컨텐츠 - 스크롤할 수 있는 충분한 공간 */}
      <div className="scrollable-content">
        {/* 헤더 */}
        <Header />
        <h1 className="main-title">두꺼비의 소비내역 조언소</h1>
        <p className="main-subtitle">
          현명한 두꺼비가 당신의 지출을 분석해드립니다
        </p>

        {/* 메인 컨텐츠 */}
        <main className="main-content">
          {hasAdvice ? (
            <div>
              {/* 통계 요약 */}
              <div className="stats-summary">
                <div className="stats-card">
                  <h2 className="stats-title">이번 달 과소비 현황</h2>
                  <div className="stats-grid">
                    <div className="stat-item stat-red">
                      <div className="stat-number">{advices.length}개</div>
                      <div className="stat-label">과소비 항목</div>
                    </div>
                    <div className="stat-item stat-orange">
                      <div className="stat-number">
                        {won(advices.reduce((sum, a) => sum + a.over, 0))}
                      </div>
                      <div className="stat-label">총 과소비 금액</div>
                    </div>
                    <div className="stat-item stat-blue">
                      <div className="stat-number">
                        {Math.round(
                          advices.reduce((sum, a) => sum + a.pct, 0) /
                            advices.length
                        )}
                        %
                      </div>
                      <div className="stat-label">평균 초과율</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 조언 카드들 */}
              <div className="advice-grid">
                {advices.map((advice, index) => (
                  <div
                    key={advice.id}
                    className="advice-card slide-in-up"
                    style={{
                      animationDelay: `${index * 100}ms`,
                    }}
                    onMouseEnter={() => setHoveredCard(advice.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() =>
                      setOpen({
                        id: advice.id,
                        title: advice.category,
                        detail: advice.detail,
                        over: advice.over,
                      })
                    }
                  >
                    {/* 심각도 표시 */}
                    <div className="severity-badge">!</div>

                    <div className="card-content">
                      <div className="card-header">
                        <img
                          className="category-img"
                          src={getCategoryImage(advice.category)}
                          alt={advice.category}
                          width={44}
                          height={44}
                          draggable={false}
                        />
                        <div className="amount-info">
                          <div className="over-amount">-{won(advice.over)}</div>
                          <div className="over-percent">
                            +{advice.pct.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <h3 className="category-title">{advice.category}</h3>

                      {/* 호버시 미리보기 */}
                      {hoveredCard === advice.id && (
                        <div className="hover-preview fade-in">
                          과소비가 발생했습니다!
                          <br />
                          클릭해서 자세한 내용을 확인하세요.
                        </div>
                      )}

                      {/* 진행률 바 */}
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(
                                100,
                                (advice.pct / 50) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // 조언 없을 때 - 축하 애니메이션
            <section className="no-advice-section">
              <div className="no-advice-hero">
                <h2 className="no-advice-title">훌륭하오! 과소비 항목이 없소!</h2>
                <img
                  src="/toadAdvice/happyToad.png"
                  alt="해피 두꺼비"
                  className="no-advice-happy-toad"
                  draggable={false}
                />
              </div>
            </section>
          )}
        </main>
      </div>

      {/* 두꺼비 캐릭터 - 하단 고정 */}
      {hasAdvice && (
        <div className="toad-character">
          <div className="character-container">
            {/* 말풍선 */}
            {showQuote && (
              <div className="speech-bubble fade-in">
                <div className="bubble-content">
                  <p className="bubble-text">{TOAD_QUOTES[currentQuote]}</p>
                  <div className="bubble-arrow" />
                </div>
              </div>
            )}

            {/* 두꺼비 캐릭터 */}
            <img
              src="/public/toadAdvice/angryToad.png"
              className="toad-emoji bob"
              onClick={() => {
                setShowQuote(!showQuote);
                setCurrentQuote(Math.floor(Math.random() * TOAD_QUOTES.length));
              }}
            ></img>
          </div>
        </div>
      )}

      {/* 모달 */}
      {open && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setOpen(null)} />
          <div className="modal-content scale-in">
            <button className="modal-close" onClick={() => setOpen(null)}>
              ×
            </button>

            <div className="modal-header">
              <img
                className="modal-icon"
                src={getCategoryImage(open.title)}
                alt={open.title}
                width={120}
                height={120}
                draggable={false}
              />
              <h3 className="modal-title">{open.title}</h3>
              <div className="modal-amount">과소비: {won(open.over)}</div>
            </div>

            <div className="modal-body">
              <p className="modal-detail">{highlightNumbers(open.detail)}</p>
            </div>

            <div className="modal-footer">
              <div className="advice-note">
                <strong>두꺼비 조언:</strong> 다음 달에는 더 신중하게
                지출하시오!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
