import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import Header from "../components/Header";
import "./LeakPotPage.css";
import LoadingOverlay from "../components/LoadingOverlay";

// --- 이미지 & 애니메이션 ---
const cryingKongjwi = "/leakPot/cryingKongjwi.png";
const happyKongjwi = "/leakPot/happyKongjwi.png";
const happyToad = "/leakPot/happyToad.png";
const angryToad = "/leakPot/angryToad.png";
const bgImage = "/leakPot/joseon-bg.png";
const customPointer = "/leakPot/money.png";
const paper = "/leakPot/paper.png";
const potImage = "/leakPot/pot.png";
const broken = "/leakPot/broken.png";
const monthGood = "/leakPot/good.png";
const monthBad = "/leakPot/bad.png";

export const leakPotAssets = [
  cryingKongjwi,
  happyKongjwi,
  happyToad,
  angryToad,
  bgImage,
  customPointer,
  paper,
  potImage,
  broken,
  monthGood,
  monthBad,
  "/leakPot/water.json",
];

// --- 타입 정의 ---
interface Category {
  id: string;
  name: string;
  spending: number;
  threshold: number;
}
interface LeakingCategory extends Category {
  originalIndex: number;
}
interface TooltipState {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}
interface LeakAnchor {
  u: number;
  v: number;
  scale: number;
}
interface AbsPosition {
  x: number;
  y: number;
  scale: number;
}

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
const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}월`,
}));

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
  { u: 0.5, v: 0.35, scale: 0.17 },
  { u: 0.3, v: 0.4, scale: 0.15 },
  { u: 0.7, v: 0.42, scale: 0.16 },
  { u: 0.2, v: 0.55, scale: 0.14 },
  { u: 0.8, v: 0.58, scale: 0.18 },
  { u: 0.48, v: 0.5, scale: 0.15 },
  { u: 0.35, v: 0.75, scale: 0.2 },
  { u: 0.65, v: 0.78, scale: 0.19 },
  { u: 0.52, v: 0.82, scale: 0.16 },
  { u: 0.75, v: 0.65, scale: 0.17 },
  { u: 0.28, v: 0.68, scale: 0.14 },
  { u: 0.6, v: 0.48, scale: 0.18 },
];
const anchorToAbs = (a: LeakAnchor): AbsPosition => ({
  x: POT_X + a.u * POT_W,
  y: POT_Y + a.v * POT_H,
  scale: a.scale,
});

// --- Month Navigation ---
const MonthNavigation: React.FC<{
  currentMonth: number;
  onMonthChange: (month: number) => void;
  leakedMonths: number[];
}> = ({ currentMonth, onMonthChange, leakedMonths }) => {
  const isLeaked = (m: number) => leakedMonths.includes(m);
  return (
    <div className="month-navigation">
      <div className="month-grid">
        {MONTHS.map((m) => {
          const active = currentMonth === m.value;
          const leaked = isLeaked(m.value);
          return (
            <button
              key={m.value}
              onClick={() => onMonthChange(m.value)}
              onMouseDown={(e) => e.preventDefault()}
              className={`month-button ${active ? "active" : ""}`}
            >
              <img
                src={leaked ? monthBad : monthGood}
                alt={leaked ? "누수" : "정상"}
                className="month-img"
                draggable={false}
              />
              <span className={`month-badge ${leaked ? "leaked" : "good"}`}>
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
const PotVisualization: React.FC<{
  leakingCategories: LeakingCategory[];
  totalLeak: number;
  formatter: Intl.NumberFormat;
}> = ({ leakingCategories, totalLeak, formatter }) => {
  const [waterAnim, setWaterAnim] = useState<any | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });

  useEffect(() => {
    fetch("/leakPot/water.json")
      .then((r) => r.json())
      .then(setWaterAnim)
      .catch(console.error);
  }, []);

  const hasLeak = leakingCategories.length > 0;
  const puddleScale = Math.min(1.0 + totalLeak / 300000, 2.2);

  return (
    <div
      className="pot-container"
      onMouseMove={(e) =>
        tooltip.visible &&
        setTooltip({ ...tooltip, x: e.clientX, y: e.clientY })
      }
    >
      {tooltip.visible && (
        <div
          className="tooltip"
          style={{ left: tooltip.x + 15, top: tooltip.y }}
        >
          {tooltip.content}
        </div>
      )}
      <div className="characters">
        <img
          src={hasLeak ? cryingKongjwi : happyKongjwi}
          alt="콩쥐"
          className="kongjwi"
        />
        <img
          src={hasLeak ? angryToad : happyToad}
          alt="두꺼비"
          className="toad"
        />
      </div>
      <div className="pot-svg-container">
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          className="pot-svg"
          preserveAspectRatio="xMidYMax meet"
        >
          <g id="pot-body">
            <image
              href={potImage}
              x={POT_X}
              y={POT_Y}
              width={POT_W}
              height={POT_H}
            />
          </g>
          <g id="cracks">
            {leakingCategories.map((cat) => {
              const anchor =
                LEAK_ANCHORS[cat.originalIndex % LEAK_ANCHORS.length];
              const { x, y, scale: baseScale } = anchorToAbs(anchor);
              const leakAmount = cat.spending - cat.threshold;
              const crackScale =
                baseScale *
                Math.max(0.4, Math.min(1.5, 0.4 + leakAmount / 80000));
              return (
                <image
                  key={cat.id}
                  href={broken}
                  x={(-450 / 2) * crackScale + x}
                  y={(-450 / 2) * crackScale + y}
                  width={450 * crackScale}
                  height={450 * crackScale}
                  onMouseEnter={(e) =>
                    setTooltip({
                      visible: true,
                      content: `${cat.name}: ${formatter.format(
                        leakAmount
                      )}냥 누수`,
                      x: e.clientX,
                      y: e.clientY,
                    })
                  }
                  onMouseLeave={() =>
                    setTooltip({ visible: false, content: "", x: 0, y: 0 })
                  }
                />
              );
            })}
          </g>
          <g id="waters">
            {leakingCategories.map((cat) => {
              const anchor =
                LEAK_ANCHORS[cat.originalIndex % LEAK_ANCHORS.length];
              const { x, y, scale: baseScale } = anchorToAbs(anchor);
              const leakAmount = cat.spending - cat.threshold;
              const waterScale = Math.max(
                0.2,
                Math.min(2.0, 0.3 + leakAmount / 80000)
              );
              return (
                <foreignObject
                  key={cat.id}
                  x={x - 225 * baseScale}
                  y={y - 225 * baseScale}
                  width={450 * baseScale}
                  height={450 * baseScale}
                  style={{ overflow: "visible", pointerEvents: "none" }}
                >
                  <div className="water-animation">
                    {waterAnim && (
                      <Lottie
                        animationData={waterAnim}
                        loop
                        autoplay
                        initialSegment={[0, 29]}
                        style={{
                          width: `${120 * waterScale}px`,
                          height: `${180 * waterScale}px`,
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
const CustomSlider: React.FC<{
  cat: Category;
  isLeaking: boolean;
  handleThresholdChange: (id: string, value: number) => void;
  formatter: Intl.NumberFormat;
}> = ({ cat, isLeaking, handleThresholdChange, formatter }) => {
  const max = Math.max(600000, cat.spending * 1.5);
  const spendingPercentage = (cat.spending / max) * 100;
  const thresholdPercentage = (cat.threshold / max) * 100;
  return (
    <div className="slider-item">
      <div className="slider-header">
        <label className={`slider-label ${isLeaking ? "leaking" : ""}`}>
          {cat.name}
        </label>
        <div className="slider-amounts">
          <span className={`current-spending ${isLeaking ? "leaking" : ""}`}>
            {formatter.format(cat.spending)}
          </span>{" "}
          / {formatter.format(cat.threshold)}
        </div>
      </div>
      <div className="slider-container">
        <div className="slider-track"></div>
        <div
          className="slider-fill-normal"
          style={{
            width: `${Math.min(spendingPercentage, thresholdPercentage)}%`,
          }}
        ></div>
        {isLeaking && (
          <div
            className="slider-fill-leak"
            style={{
              left: `${thresholdPercentage}%`,
              width: `${Math.max(
                0,
                spendingPercentage - thresholdPercentage
              )}%`,
            }}
          />
        )}
        <input
          type="range"
          min="0"
          max={max}
          step="10000"
          value={cat.threshold}
          onChange={(e) =>
            handleThresholdChange(cat.id, parseInt(e.target.value))
          }
          className={`custom-slider ${isLeaking ? "is-leaking" : ""}`}
        />
      </div>
    </div>
  );
};

// --- LeakPotPage ---
const LeakPotPage = () => {
  const { month } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [leakingCategories, setLeakingCategories] = useState<LeakingCategory[]>(
    []
  );
  const [totalLeak, setTotalLeak] = useState<number>(0);
  const [pageLoading, setPageLoading] = useState(true);
  const formatter = new Intl.NumberFormat("ko-KR");

  // 첫 진입 시 에셋 프리로드
  useEffect(() => {
    let cancelled = false;

    Promise.all(
      leakPotAssets.map(
        (src) =>
          new Promise<void>((resolve) => {
            if (src.endsWith(".json")) {
              fetch(src)
                .then((res) => (res.ok ? res.json() : null))
                .then(() => resolve())
                .catch(() => resolve()); // 실패해도 resolve
            } else {
              const img = new Image();
              img.src = src;
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    )
      .catch(() => {}) // Promise.all 자체 reject 방지
      .finally(() => {
        if (!cancelled) setPageLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const getCurrentMonth = (): number => {
    if (month) {
      const monthNum = parseInt(month);
      if (monthNum >= 1 && monthNum <= 12) return monthNum;
    }
    return new Date().getMonth() + 1;
  };
  const currentMonth = getCurrentMonth();

  useEffect(() => {
    setCategories(
      INITIAL_CATEGORIES.map((c) => ({ ...c, threshold: c.spending }))
    );
  }, [currentMonth]);

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

  const handleThresholdChange = useCallback(
    (id: string, newThreshold: number) => {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === id ? { ...cat, threshold: newThreshold } : cat
        )
      );
    },
    []
  );

  const hasLeakThisMonth = leakingCategories.length > 0;
  const leakedMonths: number[] = hasLeakThisMonth ? [currentMonth] : [];

  const rootVars: React.CSSProperties = {
    "--bg": `url(${bgImage})`,
    "--paper": `url(${paper})`,
    "--pointer": `url(${customPointer})`,
  } as React.CSSProperties;

  return (
    <div className="app-container" style={rootVars}>
      {pageLoading ? (
        <LoadingOverlay />
      ) : (
        <>
          <Header />
          <MonthNavigation
            currentMonth={currentMonth}
            onMonthChange={(m) => navigate(`/pot/${m}`)}
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
              <h2 className="panel-title">
                {currentMonth}월 지출을 다스리시오
              </h2>
              <div className="sliders-container">
                {categories.map((cat) => (
                  <CustomSlider
                    key={cat.id}
                    cat={cat}
                    isLeaking={cat.spending > cat.threshold}
                    handleThresholdChange={handleThresholdChange}
                    formatter={formatter}
                  />
                ))}
              </div>
              <div className="summary">
                {totalLeak > 0 ? (
                  <p className="summary-leak">
                    총 {formatter.format(totalLeak)}냥이 새고 있소!
                  </p>
                ) : (
                  <p className="summary-good">완벽하오! 새는 돈이 없소!</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LeakPotPage;
