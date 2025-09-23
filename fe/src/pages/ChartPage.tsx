import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import "./ChartPage.css";
import Header from "../components/Header";

const CATEGORIES = [
  "식비", "카페", "마트 / 편의점", "문화생활", "교통 / 차량", "패션 / 미용", "생활용품",
  "주거 / 통신", "건강 / 병원", "교육", "경조사 / 회비", "보험 / 세금", "기타",
] as const;

type Category = typeof CATEGORIES[number];
type Txn = { id: string; date: string; merchant: string; amount: number; category: Category };

const JP_COLORS = [
  "#B82647", "#F9D537", "#BA4160", "#31B675", "#F15B5B", "#F7B938", "#E2A6B4",
  "#417141", "#F5C8D7", "#16AA52", "#EBA6BA", "#E17691", "#5DC198", "#E16350",
];

const monthLabel = (i: number) => `${i + 1}월`;
const KRW = (n: number) => n.toLocaleString("ko-KR");
const toNum = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const me = payload.find((p: any) => p.dataKey === "me");
    const peer = payload.find((p: any) => p.dataKey === "peers");
    return (
      <div style={{ background: "#fff", border: "1px solid #ccc", padding: 12, borderRadius: 4 }}>
        <div style={{ fontWeight: "bold", color: "#000" }}>{label}</div>
        <div style={{ color: "#32CD32" }}>
          내 소비 : {me ? me.value.toLocaleString() : "-"}원
        </div>
        <div style={{ color: "#1E90FF" }}>
          또래 소비 : {peer ? peer.value.toLocaleString() : "-"}원
        </div>
      </div>
    );
  }
  return null;
};

function seedMonth(monthIdx: number): Txn[] {
  const rnd = (seed: number) => { const x = Math.sin(seed * 991 + monthIdx * 37) * 10000; return x - Math.floor(x); };
  const list: Txn[] = []; const cnt = 14 + Math.floor(rnd(1) * 10);
  for (let i = 0; i < cnt; i++) {
    const amt = Math.round((30_000 + rnd(i + 2) * 220_000) / 100) * 100;
    const cat = CATEGORIES[Math.floor(rnd(i + 3) * CATEGORIES.length)];
    const d = 1 + Math.floor(rnd(i + 4) * 27);
    list.push({
      id: `${monthIdx}-${i}`,
      date: `${monthIdx + 1}/${String(d).padStart(2, "0")}`,
      merchant: ["방앗간", "주막", "장터", "포목점", "기와집", "전당포"][Math.floor(rnd(i + 5) * 6)],
      amount: amt,
      category: cat
    });
  }
  return list;
}

export default function ChartPage() {
  const [txnsByMonth, setTxnsByMonth] = useState<Txn[][]>(
    Array.from({ length: 12 }, (_, i) => seedMonth(i))
  );

  const myMonthly = useMemo(() => txnsByMonth.map(m => m.reduce((a, t) => a + t.amount, 0)), [txnsByMonth]);
  const peerMonthly = useMemo(() => myMonthly.map((v, i) => Math.round(v * (0.9 + ((i * 17) % 15) / 100))), [myMonthly]);

  const maxPointIndex = useMemo(() => {
    const maxVal = Math.max(...myMonthly);
    return myMonthly.findIndex(v => v === maxVal);
  }, [myMonthly]);

  const lineData = useMemo(() => (
    Array.from({ length: 12 }, (_, i) => ({ idx: i, month: monthLabel(i), me: myMonthly[i], peers: peerMonthly[i] }))
  ), [myMonthly, peerMonthly]);

  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"전체" | Category>("전체");

  const scrollToTop = () => document.getElementById("jp-top")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const onPointClick = (payload: any) => {
    const idx = payload?.payload?.idx;
    if (typeof idx === "number") {
      setSelectedMonth(idx);
      setSelectedCategory("전체");
      requestAnimationFrame(() => {
        document.getElementById("jp-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const updateTxnCategory = (month: number, id: string, cat: Category) => {
    setTxnsByMonth(prev => {
      const next = prev.map(arr => arr.slice());
      const idx = next[month].findIndex(t => t.id === id);
      if (idx >= 0) next[month][idx] = { ...next[month][idx], category: cat };
      return next;
    });
  };

  const detailTxns = selectedMonth === null ? [] : txnsByMonth[selectedMonth];
  const filteredTxns = selectedMonth === null
    ? []
    : (selectedCategory === "전체" ? detailTxns : detailTxns.filter(t => t.category === selectedCategory));
  const monthTotal = selectedMonth === null ? 0 : detailTxns.reduce((a, t) => a + t.amount, 0);

  const pieData = useMemo(() => {
    if (selectedMonth === null) return [];
    if (selectedCategory === "전체") {
      return CATEGORIES.map((c, i) => ({
        name: c,
        value: detailTxns.filter(t => t.category === c).reduce((a, t) => a + t.amount, 0),
        color: JP_COLORS[i % JP_COLORS.length]
      }));
    }
    const sel = detailTxns.filter(t => t.category === selectedCategory).reduce((a, t) => a + t.amount, 0);
    const others = monthTotal - sel;
    return [
      { name: selectedCategory, value: sel, color: "#2f5d1e" },
      { name: "기타", value: others, color: "#e5dfd2" },
    ];
  }, [selectedMonth, selectedCategory, txnsByMonth]);

  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
    if (percent < 0.01) return null;

    const RADIAN = Math.PI / 180;
    const labelRadius = outerRadius + 35;
    const x = cx + labelRadius * Math.cos(-midAngle * RADIAN);
    const y = cy + labelRadius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="black"
        fontSize={10}
        fontWeight="normal"
        textAnchor="middle"
        dominantBaseline="central"
        pointerEvents="none"
      >
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const MyConsumptionDot = (props: any): React.ReactElement<SVGElement> => {
    const { cx, cy, index } = props;
    if (cx === undefined || cy === undefined) return <g />;

    const isMax = index === maxPointIndex;
    const href = isMax ? "/charts/flower.png" : "/charts/leaf.png";
    const size = 50;

    return (
      <svg
        x={cx - size / 2}
        y={cy - size / 2}
        width={size}
        height={size}
        style={{ overflow: "visible", cursor: "pointer" }}
        onClick={() => onPointClick(props)}
      >
        <image href={href} width={size} height={size} />
      </svg>
    );
  };

  const PeerDot = (props: any): React.ReactElement<SVGElement> => {
    const { cx, cy } = props;
    if (cx === undefined || cy === undefined) return <g />;

    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        stroke="#00BFFF"
        strokeWidth={2}
        fill="#ffffff"
        style={{ cursor: "pointer" }}
        onClick={() => onPointClick(props)}
      />
    );
  };

  // 전역 스크롤 스타일 조작은 제거 혹은 주석처리
  useEffect(() => {
    /*
    const html = document.documentElement;
    const prevBodyOverflow = document.body.style.overflowY;
    const prevHtmlOverflow = html.style.overflowY;
    const prevBodyH = document.body.style.height;
    const prevHtmlH = html.style.height;

    html.classList.add("allow-scroll");
    document.body.classList.add("allow-scroll");

    document.body.style.overflowY = "auto";
    html.style.overflowY = "auto";
    document.body.style.height = "auto";
    html.style.height = "auto";

    return () => {
      document.body.style.overflowY = prevBodyOverflow;
      html.style.overflowY = prevHtmlOverflow;
      document.body.style.height = prevBodyH;
      html.style.height = prevHtmlH;
      html.classList.remove("allow-scroll");
      document.body.classList.remove("allow-scroll");
    };
    */
  }, []);

  return (
    <div className="jp-wrap">
      <Header />
      <div id="jp-top" />

      <div className="jp-center-set">
        <img src="/charts/sitting_girl.png" alt="Sitting Girl" className="jp-page-image" />
        <img src="/charts/toad.png" alt="Toad" className="jp-toad-image" />
        <img src="/charts/water.png" alt="Water" className="jp-water-image" />

        <div className="jp-linechart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 18, right: 24, left: 12, bottom: 10 }}>
              <CartesianGrid stroke="#bbbbbb" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: "#ffffff" }} />
              <YAxis tickFormatter={(v) => `${Math.round(toNum(v) / 10000)}만`} tick={{ fill: "#ffffff" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="me"
                name="내 소비"
                stroke="#7CFC00"
                strokeWidth={3}
                dot={MyConsumptionDot}
                activeDot={MyConsumptionDot}
              />
              <Line
                type="monotone"
                dataKey="peers"
                name="또래 소비"
                stroke="#00BFFF"
                strokeWidth={3}
                strokeDasharray="5 3"
                dot={PeerDot}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <header className="jp-header">
        <h1>월간 소비 비교</h1>
        <p>반짝이는 점을 클릭하면 아래에 해당 달의 상세가 열립니다.</p>
      </header>

      {selectedMonth !== null && (
        <section id="jp-detail" className="jp-card">
          <div className="jp-card-head">
            <h2>{monthLabel(selectedMonth)} 상세</h2>
            <div className="jp-head-actions">
              <span className="jp-total">합계: {KRW(monthTotal)}원</span>
              <button className="jp-top-btn" onClick={scrollToTop}>라인차트로 ↑</button>
              <button className="jp-close" onClick={() => setSelectedMonth(null)}>닫기</button>
            </div>
          </div>

          <div className="jp-grid">
            <div className="jp-panel">
              <div className="jp-toolbar">
                <label>보기</label>
                <select
                  className="jp-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                >
                  <option value="전체">전체</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <table className="jp-table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th className="left">가맹점</th>
                    <th>금액</th>
                    <th>카테고리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxns.map(tx => (
                    <tr key={tx.id}>
                      <td>{tx.date}</td>
                      <td className="left">{tx.merchant}</td>
                      <td>{KRW(tx.amount)}원</td>
                      <td>
                        <select
                          className="jp-select"
                          value={tx.category}
                          onChange={(e) => updateTxnCategory(selectedMonth!, tx.id, e.target.value as Category)}
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="jp-panel">
              <div className="jp-pie-frame">
                <ResponsiveContainer width="100%" height={1000}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={160}
                      paddingAngle={1}
                      label={renderCustomLabel}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color || JP_COLORS[index % JP_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any) => [`${KRW(toNum(value))}원`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      )}

      {selectedMonth !== null && (
        <button className="jp-fab" onClick={scrollToTop} aria-label="라인차트로 돌아가기">
          ↑
        </button>
      )}
    </div>
  );
}
