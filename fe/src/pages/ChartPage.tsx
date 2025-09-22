import { useEffect, useMemo, useState } from "react";
import {
        ResponsiveContainer,
        LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
        PieChart, Pie, Cell,
} from "recharts";
import "./ChartPage.css";
import Header from "../components/Header";
import sittingGirl from "../assets/sitting_girl.png";
import toad from "../assets/toad.png";
import water from "../assets/water.png";

/* ===== 공통 ===== */
const CATEGORIES = [
        "식비", "카페", "마트/편의점", "문화생활", "교통 / 차량", "패션 / 미용", "생활용품",
        "주거 / 통신", "건강 / 병원", "교육", "경조사 / 회비", "보험 / 세금", "기타",
] as const;
type Category = typeof CATEGORIES[number];
type Txn = { id: string; date: string; merchant: string; amount: number; category: Category };

const monthLabel = (i: number) => `${i + 1}월`;
const KRW = (n: number) => n.toLocaleString("ko-KR");
const toNum = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

/* ===== MOCK: 월별 거래(나중에 API 연결) ===== */
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

/* 한지톤 팔레트 */
const JP_COLORS = [
        "#B82647",
        "#F9D537",
        "#BA4160",
        "#31B675",
        "#F15B5B",
        "#F7B938",
        "#E2A6B4",
        "#417141",
        "#F5C8D7",
        "#16AA52",
        "#EBA6BA",
        "#E17691",
        "#5DC198",
        "#E16350",
];

export default function ChartPage() {
        // 12개월 거래(카테고리 변경 반영)
        const [txnsByMonth, setTxnsByMonth] = useState<Txn[][]>(
                Array.from({ length: 12 }, (_, i) => seedMonth(i))
        );

        // 상단 라인차트 데이터(나/또래)
        const myMonthly = useMemo(() => txnsByMonth.map(m => m.reduce((a, t) => a + t.amount, 0)), [txnsByMonth]);
        const peerMonthly = useMemo(() => myMonthly.map((v, i) => Math.round(v * (0.9 + ((i * 17) % 15) / 100))), [myMonthly]);
        const lineData = useMemo(() => (
                Array.from({ length: 12 }, (_, i) => ({ idx: i, month: monthLabel(i), me: myMonthly[i], peers: peerMonthly[i] }))
        ), [myMonthly, peerMonthly]);

        // 선택된 월(없으면 상세 섹션 숨김)
        const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
        // 상세용 카테고리 필터
        const [selectedCategory, setSelectedCategory] = useState<"전체" | Category>("전체");

        const scrollToTop = () =>
                document.getElementById("jp-top")?.scrollIntoView({ behavior: "smooth", block: "start" });

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

        // 거래의 카테고리 수정
        const updateTxnCategory = (month: number, id: string, cat: Category) => {
                setTxnsByMonth(prev => {
                        const next = prev.map(arr => arr.slice());
                        const idx = next[month].findIndex(t => t.id === id);
                        if (idx >= 0) next[month][idx] = { ...next[month][idx], category: cat };
                        return next;
                });
        };

        // 선택 월의 데이터들
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

        /* ===== 포인트(점) 강조용 커스텀 Dot ===== */
        const ClickDot = (color: string) => (props: any) => {
                const { cx, cy } = props;
                return (
                        <g onClick={() => onPointClick(props)} style={{ cursor: "pointer" }}>
                                <circle cx={cx} cy={cy} r={12} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={6} />
                                <circle cx={cx} cy={cy} r={8} fill="none" stroke={color} strokeOpacity={0.45} strokeWidth={3} />
                                <circle cx={cx} cy={cy} r={5} fill={color} stroke="#1b140c" strokeWidth={2} />

                        </g>
                );
        };

        useEffect(() => {
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
        }, []);

        return (
                <div className="jp-wrap">
                        <Header />
                        {/* 페이지 상단 앵커(스크롤 복귀용) */}
                        <div id="jp-top" />

                        {/* === 반응형 이미지+차트 그룹 === */}
                        <div className="jp-center-set">
                                <img src={sittingGirl} alt="Sitting Girl" className="jp-page-image" />
                                <img src={toad} alt="Toad" className="jp-toad-image" />
                                <img src={water} alt="Water" className="jp-water-image" />

                                <div className="jp-linechart-wrap">
                                        <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={lineData} margin={{ top: 18, right: 24, left: 12, bottom: 10 }}>
                                                        <CartesianGrid stroke="#bbbbbb" strokeDasharray="3 3" />
                                                        <XAxis dataKey="month" tick={{ fill: "#ffffff" }} />
                                                        <YAxis tickFormatter={(v) => `${Math.round(toNum(v) / 10000)}만`} tick={{ fill: "#ffffff" }} />
                                                        <Tooltip formatter={(v: any) => `${KRW(toNum(v))}원`} />
                                                        <Legend />
                                                        <Line
                                                                type="monotone"
                                                                dataKey="me"
                                                                name="내 소비"
                                                                stroke="#7CFC00"
                                                                strokeWidth={3}
                                                                dot={ClickDot("#7CFC00")}
                                                                activeDot={{ r: 7 }}
                                                        />
                                                        <Line
                                                                type="monotone"
                                                                dataKey="peers"
                                                                name="또래 소비"
                                                                stroke="#00BFFF"
                                                                strokeWidth={3}
                                                                strokeDasharray="5 3"
                                                                dot={ClickDot("#00BFFF")}
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

                        {/* -------- 선택 월 상세(한 개만) -------- */}
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
                                                {/* 좌: 거래표 + 필터 */}
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
                                                                        <tr><th>날짜</th><th className="left">가맹점</th><th>금액</th><th>카테고리</th></tr>
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

                                                {/* 우: 파이차트 */}
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
                                                                                        label={({ value }) => {
                                                                                                const val = typeof value === "number" ? value : 0;
                                                                                                const percent = monthTotal ? Math.round((val / monthTotal) * 100) : 0;
                                                                                                return `${percent}%`;
                                                                                        }}
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

                        {/* 떠 있는 "상단으로" 버튼 (상세가 열려 있을 때만) */}
                        {selectedMonth !== null && (
                                <button className="jp-fab" onClick={scrollToTop} aria-label="라인차트로 돌아가기">
                                        ↑
                                </button>
                        )}
                </div>
        );
}
