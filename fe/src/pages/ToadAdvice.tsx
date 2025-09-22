import { useMemo, useState } from "react";
import "./ToadAdvice.css";
import Header from "../components/Header";

export const toadAdviceAssets = [
  "/toadAdvice/background.png",
  "/toadAdvice/angryToad.png",
  "/toadAdvice/happyToad.png",
  "/toadAdvice/paperClose.png",
  "/toadAdvice/paperOpen.png"
];

type CategoryKey = string;
interface CategoryPrediction { min:number; max:number; current:number; real:number; result:boolean; }
interface Doojo { month:number; year:number; categories_count:number; categories_prediction: Record<CategoryKey,CategoryPrediction>; }
interface BackendShape { file_id:string; doojo:Doojo[]; }

// 조언 8개 더미 데이터
const DUMMY: BackendShape = {
  file_id: "e96fbaf5-0989-4f39-bc15-57ef4ac0ade2",
  doojo: [{
    month: 8, year: 2025, categories_count: 13,
    categories_prediction: {
      "건강 / 병원": { min:100, max:200, current:150, real:120, result:false },
      "경조사 / 회비": { min:50, max:100, current:80, real:90, result:true },
      "교육": { min:200, max:300, current:250, real:260, result:true },
      "교통 / 차량": { min:150, max:250, current:200, real:180, result:false },
      "기타": { min:100, max:200, current:150, real:170, result:true },
      "마트/편의점": { min:300, max:400, current:350, real:360, result:true },
      "문화생활": { min:100, max:200, current:150, real:140, result:false },
      "보험 / 세금": { min:200, max:300, current:250, real:240, result:false },
      "생활용품": { min:150, max:250, current:200, real:220, result:true },
      "식비": { min:400, max:500, current:450, real:480, result:true },
      "주거 / 통신": { min:300, max:400, current:350, real:330, result:false },
      "카페": { min:100, max:200, current:150, real:160, result:true },
      "패션 / 미용": { min:150, max:250, current:200, real:210, result:true },
    },
  }],
};

// 조언이 없는 더미 데이터 (0개)
export const DUMMY_NO_ADVICE: BackendShape = {
  file_id: "78f1b6b8-9b1d-4f83-8e57-0a7a6c3c0fa2",
  doojo: [
    {
      month: 8,
      year: 2025,
      categories_count: 13,
      categories_prediction: {
        "건강 / 병원":   { min: 100, max: 200, current: 150, real: 120, result: false },
        "경조사 / 회비": { min: 50,  max: 100, current: 80,  real: 70,  result: false },
        "교육":         { min: 200, max: 300, current: 250, real: 230, result: false },
        "교통 / 차량":   { min: 150, max: 250, current: 200, real: 180, result: false },
        "기타":         { min: 100, max: 200, current: 150, real: 130, result: false },
        "마트/편의점":   { min: 300, max: 400, current: 350, real: 320, result: false },
        "문화생활":      { min: 100, max: 200, current: 150, real: 140, result: false },
        "보험 / 세금":   { min: 200, max: 300, current: 250, real: 240, result: false },
        "생활용품":      { min: 150, max: 250, current: 200, real: 190, result: false },
        "식비":         { min: 400, max: 500, current: 450, real: 430, result: false },
        "주거 / 통신":   { min: 300, max: 400, current: 350, real: 330, result: false },
        "카페":         { min: 100, max: 200, current: 150, real: 140, result: false },
        "패션 / 미용":   { min: 150, max: 250, current: 200, real: 180, result: false },
      },
    },
  ],
};


const won = (n:number) => new Intl.NumberFormat("ko-KR", {maximumFractionDigits:0}).format(n) + "원";
const estimateAvg = (min:number, max:number) => (min + max) / 2;

export default function ToadAdvice() {
  const sheet = DUMMY.doojo[0];
//   const sheet = DUMMY_NO_ADVICE.doojo[0];
  const preds = sheet.categories_prediction;

  const advices = useMemo(() => {
    return Object.entries(preds).filter(([,v]) => v.result)
      .map(([category, v]) => {
        const avg = estimateAvg(v.min, v.max);
        const pct = avg>0 ? ((v.real-avg)/avg)*100 : 0;
        const over = Math.max(0, v.real - v.current);
        const detail =
          `‘${category}’의 누수 기준액이 ${won(v.current)}인데\n실제로 ${won(v.real)} 만큼 썼고\n` +
          `12개월 평균치보다 약 ${pct.toFixed(1)}% 높다고 판단해\n${won(over)} 만큼의 과소비가 발생했소!`;
        return { id: category, category, detail };
      });
  }, [preds]);

  const [open, setOpen] = useState<null | {id:string; title:string; detail:string}>(null);
  const hasAdvice = advices.length > 0;

  return (
    <div className="toadAdvice__wrap">
      <div className="toadAdvice__bg" />
      <Header />

      {/* 조언 있을 때만 우하단 두꺼비 노출 */}
      {hasAdvice && (
        <img
          className="toadAdvice__toadFixed angry"
          src="/toadAdvice/angryToad.png"
          alt="두꺼비"
          draggable={false}
        />
      )}

      <main className="toadAdvice__content">
        {hasAdvice ? (
          <ul className="paperGrid" role="list">
            {advices.map(a => (
              <li key={a.id} className="paperItem">
                <button
                  className="paperClose"
                  onClick={() => setOpen({ id: a.id, title: a.category, detail: a.detail })}
                  aria-label={`${a.category} 조언 펼치기`}
                >
                  <img className="paperClose__img" src="/toadAdvice/paperClose.png" alt="접힌 두루마리" />
                  <span className="paperClose__title">{a.category}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          // ✅ 중앙 큰 해피두꺼비 + 흰색 문구
          <div className="toadAdvice__emptyCenter">
            <img
              className="toadAdvice__emptyToad"
              src="/toadAdvice/happyToad.png"
              alt="해피 두꺼비"
              draggable={false}
            />
            <div className="toadAdvice__emptyText">
              훌륭하오! 과소비가 하나도 없소!
            </div>
          </div>
        )}
      </main>

      {open && (
        <div className="paperOpen__overlay" role="dialog" aria-modal="true">
          <button className="paperOpen__backdrop" onClick={() => setOpen(null)} aria-label="닫기" />
          <div className="paperOpen__stage">
            <img className="paperOpen__img" src="/toadAdvice/paperOpen.png" alt="펼친 두루마리" />
            <div className="paperOpen__text">
              <h3 className="paperOpen__title">{open.title}</h3>
              <p className="paperOpen__detail">{open.detail}</p>
            </div>
            <button className="paperOpen__close" onClick={() => setOpen(null)} aria-label="닫기">닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
