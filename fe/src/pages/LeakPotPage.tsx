// src/pages/LeakPotPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import Header from "../components/Header";

// --- 이미지 & 애니메이션 ---
const cryingKongjwi = "/leakPot/cryingKongjwi.png";
const happyKongjwi  = "/leakPot/happyKongjwi.png";
const happyToad     = "/leakPot/happyToad.png";
const angryToad     = "/leakPot/angryToad.png";
const bgImage       = "/leakPot/joseon-bg.png";
const customPointer = "/leakPot/money.png";
const paper         = "/leakPot/paper.png";
const potImage      = "/leakPot/pot.png";
const broken        = "/leakPot/broken.png";
// 월 토큰 이미지
const monthGood     = "/leakPot/good.png";
const monthBad      = "/leakPot/bad.png";

// 월 숫자 배경 컬러
const MONTH_BAD_BG  = "#28427B"; // 누수 시
const MONTH_GOOD_BG = "#FFC83E"; // 정상 시

// --- 타입 정의 ---
interface Category { id: string; name: string; spending: number; threshold: number; }
interface LeakingCategory extends Category { originalIndex: number; }
interface TooltipState { visible: boolean; content: string; x: number; y: number; }
interface LeakAnchor { u: number; v: number; scale: number; }
interface AbsPosition { x: number; y: number; scale: number; }

// --- 데이터 ---
const INITIAL_CATEGORIES: Category[] = [
  { id: "food", name: "식비", spending: 300000, threshold: 300000 },
  { id: "shopping", name: "쇼핑", spending: 220000, threshold: 220000 },
  { id: "transport", name: "교통", spending: 150000, threshold: 150000 },
  { id: "hobby", name: "여가", spending: 100000, threshold: 100000 },
  { id: "housing", name: "주거", spending: 550000, threshold: 550000 },
  { id: "education", name: "교육", spending: 280000, threshold: 280000 },
  { id: "communication", name: "통신", spending: 90000, threshold: 90000 },
  { id: "pets", name: "반려동물", spending: 100000, threshold: 100000 },
  { id: "health", name: "의료/건강", spending: 80000, threshold: 80000 },
  { id: "events", name: "경조사비", spending: 120000, threshold: 120000 },
  { id: "savings", name: "저축/투자", spending: 200000, threshold: 200000 },
  { id: "etc", name: "기타", spending: 50000, threshold: 50000 },
];

// 월 데이터
const MONTHS = [
  { value: 1, label: "1월" }, { value: 2, label: "2월" },
  { value: 3, label: "3월" }, { value: 4, label: "4월" },
  { value: 5, label: "5월" }, { value: 6, label: "6월" },
  { value: 7, label: "7월" }, { value: 8, label: "8월" },
  { value: 9, label: "9월" }, { value: 10, label: "10월" },
  { value: 11, label: "11월" }, { value: 12, label: "12월" },
];

// 레이아웃 값
const VIEWBOX_W = 500;
const VIEWBOX_H = 520;
const FLOOR_Y = 515;
const POT_W = 310;
const POT_H = 330;
const POT_X = 95;
const POT_Y = FLOOR_Y - 8 - POT_H;

// 깨짐 위치
const LEAK_ANCHORS: LeakAnchor[] = [
  { u: 0.5, v: 0.35, scale: 0.17 }, { u: 0.3, v: 0.4, scale: 0.15 },
  { u: 0.7, v: 0.42, scale: 0.16 }, { u: 0.2, v: 0.55, scale: 0.14 },
  { u: 0.8, v: 0.58, scale: 0.18 }, { u: 0.48, v: 0.5, scale: 0.15 },
  { u: 0.35, v: 0.75, scale: 0.2 }, { u: 0.65, v: 0.78, scale: 0.19 },
  { u: 0.52, v: 0.82, scale: 0.16 }, { u: 0.75, v: 0.65, scale: 0.17 },
  { u: 0.28, v: 0.68, scale: 0.14 }, { u: 0.6, v: 0.48, scale: 0.18 },
];
const anchorToAbs = (a: LeakAnchor): AbsPosition => ({
  x: POT_X + a.u * POT_W,
  y: POT_Y + a.v * POT_H,
  scale: a.scale,
});

// --- Month Navigation Component ---
interface MonthNavigationProps {
  currentMonth: number;
  onMonthChange: (month: number) => void;
  leakedMonths: number[]; // 누수 발생한 달 목록
}

const MonthNavigation: React.FC<MonthNavigationProps> = ({
  currentMonth,
  onMonthChange,
  leakedMonths,
}) => {
  const isLeaked = (m: number) => leakedMonths.includes(m);

  return (
    <div className="month-navigation">
      {/* 다른 전역 CSS는 건드리지 않고, 여기에서만 가로 12칸 풀폭을 인라인 지정 */}
      <div
        className="month-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 6,
          width: "100%",
          maxWidth: "none",
        }}
      >
        {MONTHS.map((m) => {
          const active = currentMonth === m.value;
          const leaked = isLeaked(m.value);

          // 이미지 스케일: 기본은 축소, 현재 달은 확대(테두리 없이)
          const imgScalePercent = active ? 100 : 60;

          return (
            <button
              key={m.value}
              onClick={() => onMonthChange(m.value)}
              aria-label={`${m.label}${leaked ? " (누수)" : ""}`}
              style={{
                position: "relative",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: "9999px",
                // 강조 효과는 크기 차이만 사용 (테두리/그림자 제거)
                outline: "none",
                boxShadow: "none",
                // 가운데 정렬을 위해 그리드 사용
                display: "grid",
                placeItems: "center",
              }}
            >
              <img
                src={leaked ? monthBad : monthGood}
                alt={leaked ? "누수" : "정상"}
                style={{
                  width: `${imgScalePercent}%`,
                  height: "auto",
                  display: "block",
                  // 활성 효과를 좀 더 자연스럽게
                  transition: "width .18s ease",
                }}
                draggable={false}
              />
              {/* 월 숫자 배경색: 누수(#28427B) / 정상(#FFC83E) */}
              <span
                style={{
                  position: "absolute",
                  right: "8%",
                  top: "8%",
                  background: leaked ? MONTH_BAD_BG : MONTH_GOOD_BG,
                  color: leaked ? "#fff" : "#333",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 2,
                  fontSize: "clamp(10px, 1.6vw, 14px)",
                  lineHeight: 1,
                  userSelect: "none",
                  boxShadow: "0 1px 2px rgba(0,0,0,.25)",
                }}
              >
                {m.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// --- Pot Visualization ---
const WATER_BASE_W = 120;
const WATER_BASE_H = 180;
const WATER_STREAM_ORIGIN_X_RATIO = 0.03;
const WATER_STREAM_ORIGIN_Y_RATIO = 0.28;
const WATER_ALPHA = 0.55;
const PUDDLE_DY = -25;

interface PotVisualizationProps {
  leakingCategories: LeakingCategory[];
  totalLeak: number;
  formatter: Intl.NumberFormat;
}

const PotVisualization: React.FC<PotVisualizationProps> = ({
  leakingCategories,
  totalLeak,
  formatter,
}) => {
  const [waterAnim, setWaterAnim] = useState<any | null>(null);
  useEffect(() => {
    fetch("/leakPot/water.json")
      .then((r) => r.json())
      .then(setWaterAnim)
      .catch(console.error);
  }, []);

  const hasLeak = leakingCategories.length > 0;
  const puddleScale = Math.min(1.0 + totalLeak / 300000, 2.2);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });

  const handleMouseOver = (e: React.MouseEvent, cat: LeakingCategory) => {
    const leakAmount = cat.spending - cat.threshold;
    setTooltip({
      visible: true,
      content: `${cat.name}: ${formatter.format(leakAmount)}냥 누수`,
      x: e.clientX,
      y: e.clientY,
    });
  };
  const handleMouseOut = () => setTooltip({ visible: false, content: "", x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    if (tooltip.visible) setTooltip({ ...tooltip, x: e.clientX, y: e.clientY });
  };

  return (
    <div className="pot-container" onMouseMove={handleMouseMove}>
      {tooltip.visible && (
        <div
          className="tooltip"
          style={{ left: tooltip.x + 15, top: tooltip.y, transform: "translateY(-100%)" }}
        >
          {tooltip.content}
        </div>
      )}

      {/* 캐릭터 */}
      <div className="characters">
        <img src={hasLeak ? cryingKongjwi : happyKongjwi} alt="콩쥐" className="kongjwi" />
        <img src={hasLeak ? angryToad : happyToad} alt="두꺼비" className="toad" />
      </div>

      {/* 항아리 + 물 */}
      <div className="pot-svg-container">
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          className="pot-svg"
          preserveAspectRatio="xMidYMax meet"
          style={{ overflow: "visible" }}
        >
          <defs>
            <radialGradient id="puddleGradient" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#87CEEB" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#4682B4" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#2E5984" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.6" />
            </radialGradient>
            <radialGradient id="puddleReflection" cx="45%" cy="25%" r="30%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#87CEEB" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#4682B4" stopOpacity="0.1" />
            </radialGradient>
            <filter id="waterDistortion" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence baseFrequency="0.03 0.09" numOctaves="2" seed="2" result="turbulence" />
              <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="8" />
            </filter>
          </defs>

          {/* puddle */}
          <g
            id="puddle-group"
            transform={`translate(0, ${PUDDLE_DY})`}
            style={{ opacity: hasLeak ? 0.7 : 0, transition: "opacity 0.7s ease-out" }}
          >
            <g
              transform={`translate(250, ${FLOOR_Y}) scale(${hasLeak ? puddleScale : 0}) translate(-250, -${FLOOR_Y})`}
              style={{ transition: "transform 0.7s ease-out" }}
            >
              <ellipse cx="250" cy={FLOOR_Y} rx="95" ry="16" fill="url(#puddleGradient)" filter="url(#waterDistortion)" />
              <ellipse cx="240" cy={FLOOR_Y - 3} rx="46" ry="6" fill="url(#puddleReflection)" filter="url(#waterDistortion)" />
            </g>
          </g>

          {/* pot */}
          <g id="pot-body">
            <image href={potImage} x={POT_X} y={POT_Y} width={POT_W} height={POT_H} />
          </g>

          {/* cracks */}
          <g id="cracks">
            {leakingCategories.map((cat) => {
              const anchor = LEAK_ANCHORS[cat.originalIndex % LEAK_ANCHORS.length];
              const { x, y, scale: baseScale } = anchorToAbs(anchor);
              const leakAmount = cat.spending - cat.threshold;
              const crackScale = baseScale * Math.max(0.4, Math.min(1.5, 0.4 + leakAmount / 80000));

              return (
                <image
                  key={cat.id}
                  href={broken}
                  x={(-450 / 2) * crackScale + x}
                  y={(-450 / 2) * crackScale + y}
                  width={450 * crackScale}
                  height={450 * crackScale}
                  style={{ opacity: 0.9, pointerEvents: "all" }}
                  onMouseEnter={(e) => handleMouseOver(e, cat)}
                  onMouseLeave={handleMouseOut}
                />
              );
            })}
          </g>

          {/* waters */}
          <g id="waters">
            {leakingCategories.map((cat) => {
              const anchor = LEAK_ANCHORS[cat.originalIndex % LEAK_ANCHORS.length];
              const { x, y, scale: baseScale } = anchorToAbs(anchor);
              const leakAmount = cat.spending - cat.threshold;
              const isLeft = anchor.u < 0.5;
              const waterScale = Math.max(0.2, Math.min(2.0, 0.3 + leakAmount / 80000));

              return (
                <foreignObject
                  key={cat.id}
                  x={x - 225 * baseScale}
                  y={y - 225 * baseScale}
                  width={450 * baseScale}
                  height={450 * baseScale}
                  style={{ overflow: "visible", pointerEvents: "none" }}
                >
                  <div className="water-animation" style={{ transform: `scaleX(${isLeft ? -1 : 1})`, opacity: WATER_ALPHA }}>
                    {waterAnim && (
                      <Lottie
                        animationData={waterAnim}
                        loop
                        autoplay
                        initialSegment={[0, 29]}
                        style={{
                          position: "absolute",
                          width: `${WATER_BASE_W * waterScale}px`,
                          height: `${WATER_BASE_H * waterScale}px`,
                          left: `calc(50% - ${WATER_BASE_W * waterScale * WATER_STREAM_ORIGIN_X_RATIO}px)`,
                          top:  `calc(50% - ${WATER_BASE_H * waterScale * WATER_STREAM_ORIGIN_Y_RATIO}px)`,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                  </div>
                </foreignObject>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};

// --- Custom Slider ---
interface CustomSliderProps {
  cat: Category;
  isLeaking: boolean;
  handleThresholdChange: (id: string, value: number) => void;
  formatter: Intl.NumberFormat;
}

const CustomSlider: React.FC<CustomSliderProps> = ({
  cat,
  isLeaking,
  handleThresholdChange,
  formatter,
}) => {
  const max = Math.max(600000, cat.spending * 1.5);
  const spendingPercentage = (cat.spending / max) * 100;
  const thresholdPercentage = (cat.threshold / max) * 100;

  return (
    <div className="slider-item">
      <div className="slider-header">
        <label className={`slider-label ${isLeaking ? "leaking" : ""}`}>{cat.name}</label>
        <div className="slider-amounts">
          <span className={`current-spending ${isLeaking ? "leaking" : ""}`}>
            {formatter.format(cat.spending)}
          </span>{" "}
          / {formatter.format(cat.threshold)}
        </div>
      </div>
      <div className="slider-container">
        <div className="slider-track"></div>
        <div className="slider-fill-normal" style={{ width: `${Math.min(spendingPercentage, thresholdPercentage)}%` }}></div>
        {isLeaking && (
          <div className="slider-fill-leak" style={{ left: `${thresholdPercentage}%`, width: `${Math.max(0, spendingPercentage - thresholdPercentage)}%` }} />
        )}
        <input
          type="range"
          min="0"
          max={max}
          step="10000"
          value={cat.threshold}
          onChange={(e) => handleThresholdChange(cat.id, parseInt(e.target.value))}
          className={`custom-slider ${isLeaking ? "is-leaking" : ""}`}
        />
      </div>
    </div>
  );
};

// --- 메인 App ---
const LeakPotPage = () => {
  const { month } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [leakingCategories, setLeakingCategories] = useState<LeakingCategory[]>([]);
  const [totalLeak, setTotalLeak] = useState<number>(0);
  const formatter = new Intl.NumberFormat("ko-KR");

  // 현재 월 계산 (URL 파라미터 또는 현재 날짜)
  const getCurrentMonth = (): number => {
    if (month) {
      const monthNum = parseInt(month);
      if (monthNum >= 1 && monthNum <= 12) return monthNum;
    }
    return new Date().getMonth() + 1;
  };
  const currentMonth = getCurrentMonth();

  useEffect(() => {
    setCategories(INITIAL_CATEGORIES.map(c => ({ ...c, threshold: c.spending })));
  }, [currentMonth]);

  // 월 변경 핸들러
  const handleMonthChange = (newMonth: number) => navigate(`/pot/${newMonth}`);

  useEffect(() => {
    const currentLeaking = categories
      .map((cat, index) => ({ ...cat, originalIndex: index }))
      .filter((cat) => cat.spending > cat.threshold);
    const currentTotalLeak = currentLeaking.reduce(
      (sum, cat) => sum + (cat.spending - cat.threshold),
      0
    );
    setLeakingCategories(currentLeaking);
    setTotalLeak(currentTotalLeak);
  }, [categories]);

  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = `
      @font-face {
        font-family: 'Joseon100Years';
        src: url('https://gcore.jsdelivr.net/gh/projectnoonnu/noonfonts_2206-02@1.0/ChosunCentennial.woff2') format('woff2');
      }
      .app-container{ width:100vw;height:100vh;display:flex;flex-direction:column;font-family:'Joseon100Years',serif;overflow:hidden;background-image:url('${bgImage}');background-size:cover;background-position:center;}
      .header{ background:transparent; padding:0 40px; z-index:100;}
      .nav{ display:flex; justify-content:center; gap:48px; max-width:800px; margin:0 auto;}
      .nav-item{ color:#f5f5f4; text-decoration:none; padding:20px 16px; font-weight:500; font-size:18px; transition:all .2s ease; border-bottom:2px solid transparent;}
      .nav-item:hover{ color:#fbbf24; }
      .month-navigation{ background:transparent; z-index:99; padding: 0 100px}
      .month-grid{ display:grid; grid-template-columns:repeat(6,1fr); gap:8px; max-width:600px; margin:0 auto; }
      @media (min-width:768px){ .month-grid{ grid-template-columns:repeat(12,1fr);} }
      .month-button{ background:transparent; border:2px solid rgba(120,113,108,.3); border-radius:8px; padding:8px 12px; font-family:'Joseon100Years',serif; font-size:14px; font-weight:500; color:#57534e; cursor:pointer; transition:all .2s ease;}
      .month-button:hover{ background:rgba(120,113,108,.1); border-color:#78716c; color:#292524; }
      .month-button.active{ background:#a12a2a; border-color:#a12a2a; color:#fff; font-weight:bold; }
      .main-container{ flex:1; display:flex; flex-direction:column; align-items:end; justify-content:center; gap:32px; position:relative; overflow:visible;}
      @media (min-width:768px){ .main-container{ flex-direction:row; } }
      .pot-container{ position:absolute; inset:0; display:flex; align-items:end; justify-content:center; pointer-events:none;}
      .tooltip{ position:absolute; z-index:50; padding:8px; font-size:14px; background:rgba(0,0,0,.7); color:#fff; border-radius:6px; pointer-events:none;}
      .characters{ position:absolute; bottom:0; left:0; display:flex; align-items:end; z-index:1;}
      .kongjwi{ width:328px; height:auto; object-fit:contain; filter:drop-shadow(0 25px 25px rgba(0,0,0,.15)); position:relative; z-index:10;}
      @media (min-width:768px){ .kongjwi{ width:384px; } }
      .toad{ width:192px; height:auto; object-fit:contain; filter:drop-shadow(0 25px 25px rgba(0,0,0,.15)); margin-left:-56px; position:relative; z-index:10;}
      @media (min-width:768px){ .toad{ width:224px; } }
      .pot-svg-container{ width:100%; height:100%; position:relative;}
      .pot-svg{ position:absolute; inset:0; width:100%; height:100%;}
      .water-animation{ width:100%; height:100%; position:relative; transform-origin:50% 50%; pointer-events:none;}
      .control-panel{ position:relative; z-index:20; display:flex; flex-direction:column; width:40vw; max-width:500px; min-width:380px; height:70vh; padding:0 20px; max-height:800px; background-image:url('${paper}'); background-size:100% 100%; background-repeat:no-repeat; background-position:center;}
      @media (min-width:768px){ .control-panel{ position:absolute; right:40px; bottom:24px; } }
      .panel-title{ font-size:28px; font-weight:bold; margin-top:80px; padding-top:16px; padding-bottom:0; color:#292524; text-align:center; flex-shrink:0;}
      .sliders-container{ flex-grow:1; overflow-y:auto; padding:10px 80px; scrollbar-width:none; -ms-overflow-style:none;}
      .sliders-container::-webkit-scrollbar{ width:0; height:0;}
      .slider-item{ padding:12px 0; border-bottom:1px solid rgba(120,113,108,.2);}
      .slider-item:last-child{ border-bottom:none;}
      .slider-header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;}
      .slider-label{ font-weight:bold; font-size:16px; transition:color .2s; color:#292524;}
      .slider-label.leaking{ color:#a12a2a;}
      .slider-amounts{ text-align:right; font-size:12px; font-weight:500; color:#57534e; flex-shrink:0; margin-left:8px;}
      .current-spending{ font-weight:bold; color:#292524;}
      .current-spending.leaking{ color:#a12a2a;}
      .slider-container{ position:relative; height:32px; display:flex; align-items:center;}
      .slider-track{ position:absolute; top:50%; transform:translateY(-50%); width:100%; height:6px; background:#d6d3d1; border-radius:9999px; overflow:hidden;}
      .slider-fill-normal{ position:absolute; top:50%; transform:translateY(-50%); height:6px; border-radius:9999px; background:#5a7e63;}
      .slider-fill-leak{ position:absolute; top:50%; transform:translateY(-50%); height:6px; background:#a12a2a; border-radius:9999px; clip-path:inset(0 round 9999px);}
      .custom-slider{ width:100%; position:absolute; top:0; left:0; height:100%; -webkit-appearance:none; appearance:none; background:transparent; cursor:pointer; --thumb-size:48px; --track-size:12px;}
      .custom-slider:focus{ outline:none;}
      .custom-slider::-webkit-slider-runnable-track{ height:var(--track-size); background:transparent;}
      .custom-slider::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:var(--thumb-size); height:var(--thumb-size); margin-top:calc((var(--thumb-size) - var(--track-size)) / -2); background-image:url('${customPointer}'); background-size:contain; background-position:center; background-repeat:no-repeat; border:none; cursor:pointer;}
      .summary{ margin-top:0; margin-bottom:60px; font-size:18px; text-align:center; flex-shrink:0;}
      .summary-leak{ font-weight:bold; color:#a12a2a;}
      .summary-good{ font-weight:bold; color:#166534;}
    `;
    document.head.appendChild(styleElement);
    return () => { if (styleElement.parentNode) document.head.removeChild(styleElement); };
  }, []);

  const handleThresholdChange = (id: string, newThreshold: number): void =>
    setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, threshold: newThreshold } : cat)));

  // 현재 달의 누수 여부에 따라 월 토큰 표시
  const hasLeakThisMonth = leakingCategories.length > 0;
  const leakedMonths: number[] = hasLeakThisMonth ? [currentMonth] : [];

  return (
    <div className="app-container">
      <Header />
      <MonthNavigation
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
        leakedMonths={leakedMonths}
      />
      <div className="main-container">
        <div className="pot-container">
          <PotVisualization
            leakingCategories={leakingCategories}
            totalLeak={totalLeak}
            formatter={formatter}
          />
        </div>

        <div className="control-panel">
          <h2 className="panel-title">{currentMonth}월 지출을 다스리시오</h2>
          <div className="sliders-container">
            {categories.map((cat) => {
              const isLeaking = cat.spending > cat.threshold;
              return (
                <CustomSlider
                  key={cat.id}
                  cat={cat}
                  isLeaking={isLeaking}
                  handleThresholdChange={handleThresholdChange}
                  formatter={formatter}
                />
              );
            })}
          </div>
          <div className="summary">
            {totalLeak > 0 ? (
              <p className="summary-leak">총 {formatter.format(totalLeak)}냥이 새고 있소!</p>
            ) : (
              <p className="summary-good">완벽하오! 새는 돈이 없소!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeakPotPage;
