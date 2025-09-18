import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import "./Mypage.css";
import { useUserInfoQuery } from "../api/queries/userQuery";
import { useUpdateUserBasicInfoMutation } from "../api/mutation/userMutation";
import { useCardInfoQuery } from "../api/queries/cardQuery";
import { useRegisterCardMutation } from "../api/mutation/cardMutation";
import type { UserInfo as ApiUserInfo } from "../types/user";
import type { Gender } from "../types";
import type { CardInfo } from "../api/services/cards";

type Phase = "CLOSED" | "OPEN" | "SITTING" | "PAPER";
type LocalUserInfo = {
  gender: Gender;
  age: number | null;
  account?: string;
  cvc?: string;
};

const IMG_CLOSE  = "/mypage/close.png";
const IMG_OPEN   = "/mypage/open.png";
const IMG_SIT    = "/mypage/sitting.png";
const IMG_PAPER  = "/mypage/paper.png";   

const digitsOnly = (v: string, max?: number) =>
  v.replace(/\D/g, "").slice(0, typeof max === "number" ? max : undefined);

const formatAccount = (raw: string) => {
  const d = digitsOnly(raw, 16);
  const parts = d.match(/.{1,4}/g) || [];
  return parts.join("-").slice(0, 19);
};

const maskAccount = (acct?: string) => {
  if (!acct || !/^\d{4}-\d{4}-\d{4}-\d{4}$/.test(acct)) return "";
  const last4 = acct.slice(-4);
  return `****-****-****-${last4}`;
};


const loadUser = (apiUserData?: ApiUserInfo, cardData?: CardInfo): LocalUserInfo => {
  try {
    // API 데이터가 있으면 사용, 없으면 기본값
    if (apiUserData) {
      const { gender, age } = apiUserData;
      return {
        gender: gender || "",
        age: age || null,
        account: cardData?.account,
        cvc: cardData?.cvc,
      };
    }

    // API 데이터가 없으면 기본값 반환
    return { gender: "", age: null };
  } catch {
    return { gender: "", age: null };
  }
};

export default function MyPage() {
  const [phase, setPhase] = useState<Phase>("CLOSED");

  const { data: userData } = useUserInfoQuery();
  const { data: cardData } = useCardInfoQuery();
  const updateUserBasicInfoMutation = useUpdateUserBasicInfoMutation();
  const registerCardMutation = useRegisterCardMutation();

  const [user, setUser] = useState<LocalUserInfo>(() => loadUser(userData, cardData));

  // userData 또는 cardData 변경 시 user 상태 동기화
  useEffect(() => {
    if (userData || cardData) {
      setUser(loadUser(userData, cardData));
    }
  }, [userData, cardData]);

  const [gEditing, setGEditing] = useState<Gender>(user.gender);
  const [ageEditing, setAgeEditing] = useState<string>(
    user.age === null ? "" : String(user.age)
  );

  // 카드: 삭제 직후 재등록 라벨 제어
  const [justDeleted, setJustDeleted] = useState(false);

  // 카드 등록 폼 (카드가 없을 때만 사용)
  const [acctNew, setAcctNew] = useState("");
  const [cvcNew, setCvcNew] = useState("");

  // PAPER를 열 때마다 최신 사용자 정보로 폼 동기화
  const prevPhase = useRef<Phase>(phase);
  useEffect(() => {
    if (phase === "PAPER" && prevPhase.current !== "PAPER") {
      const fresh = loadUser(userData, cardData);
      setUser(fresh);
      setGEditing(fresh.gender);
      setAgeEditing(fresh.age === null ? "" : String(fresh.age));
      setJustDeleted(false);
      setAcctNew("");
      setCvcNew("");
    }
    prevPhase.current = phase;
  }, [phase, userData, cardData]);

  // 유효성
  const accountValid = useMemo(
    () => /^\d{4}-\d{4}-\d{4}-\d{4}$/.test(acctNew),
    [acctNew]
  );
  const cvcValid = useMemo(() => /^\d{3}$/.test(cvcNew), [cvcNew]);
  const ageValid = useMemo(
    () => /^\d+$/.test(ageEditing) && Number(ageEditing) > 0,
    [ageEditing]
  );

  // 변경 여부에 따라 저장 버튼 노출/활성화
  const basicDirty = useMemo(() => {
    const ageNum = ageEditing ? Number(ageEditing) : null;
    return gEditing !== user.gender || (user.age ?? null) !== ageNum;
  }, [gEditing, user.gender, user.age, ageEditing]);

  const handleSaveBasic = () => {
    if (!ageValid || !basicDirty) return;

    updateUserBasicInfoMutation.mutate({
      gender: gEditing,
      age: Number(ageEditing)
    });
  };

  const handleDeleteCard = () => {
    if (!user.account) return;
    if (!window.confirm("등록된 카드를 삭제할까요?")) return;
    setAcctNew("");
    setCvcNew("");
    setJustDeleted(true);
  };

  const handleRegisterCard = () => {
    if (!accountValid || !cvcValid) return;
    
    registerCardMutation.mutate({
      cardNo: acctNew,
      cvc: cvcNew,
    }, {
      onSuccess: () => {
        // 로컬 상태 업데이트
        setAcctNew("");
        setCvcNew("");
        setJustDeleted(false);
      },
      onError: (error) => {
        console.error('카드 등록 실패:', error);
        // 에러 처리 로직 필요시 추가
      }
    });
  };

  const closeToHome = () => {
    setPhase("CLOSED");
    setJustDeleted(false);
  };

  return (
    <div className="mp-wrap">
      <div className="mp-fixed-header">
        <Header />
      </div>

      {/* 배경 레이어 */}
      {phase !== "PAPER" ? (
        <img
          className="mp-bg"
          src={phase === "CLOSED" ? IMG_CLOSE : phase === "OPEN" ? IMG_OPEN : IMG_SIT}
          alt={
            phase === "CLOSED"
              ? "문이 닫힌 초가집"
              : phase === "OPEN"
              ? "문이 열린 초가집, 콩쥐가 안에서 손짓"
              : "방 안의 콩쥐가 문서를 내미는 장면"
          }
          draggable={false}
        />
      ) : (
        <>
          <img className="mp-bg" src={IMG_SIT} alt="방 안 배경" draggable={false} />

          {/* 종이 모달 */}
          <div className="paper-modal" role="dialog" aria-modal="true" aria-label="내 정보 수정">
            <div className="paper-stage">
              <img className="paper-img" src={IMG_PAPER} alt="" aria-hidden="true" />
              <div className="paper-content">
                <header className="paper-header">
                  <strong>콩쥐의 정보 수정하기</strong>
                  <button className="btn ghost" onClick={closeToHome} aria-label="닫기">
                    닫기
                  </button>
                </header>

                <div className="paper-body">
                  {/* 기본 정보 */}
                  <section className="paper-block">
                    <h3>기본</h3>

                    <div className="grid two">
                      <label className="field">
                        <span>이름</span>
                        <div className="readonly-value">
                          {userData?.name || ""}
                        </div>
                      </label>
                      <label className="field">
                        <span>성별</span>
                        <div className="seg">
                          {(["여성", "남성"] as const).map((g) => (
                            <button
                              key={g}
                              type="button"
                              className={`chip ${gEditing === g ? "on" : ""}`}
                              aria-pressed={gEditing === g}
                              onClick={() => setGEditing(g)}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </label>

                      <label className="field">
                        <span>나이</span>
                        <input
                          className={`input ${ageEditing && !ageValid ? "err" : ""}`}
                          inputMode="numeric"
                          maxLength={3}
                          placeholder="예) 20"
                          value={ageEditing}
                          onChange={(e) => setAgeEditing(digitsOnly(e.target.value, 3))}
                        />
                      </label>
                    </div>

                    {basicDirty && (
                      <div className="row-end appear">
                        <button
                          className="btn primary"
                          onClick={handleSaveBasic}
                          disabled={!ageValid}
                        >
                          기본 정보 저장
                        </button>
                      </div>
                    )}
                  </section>

                  {/* 카드 정보 */}
                  <section className="paper-block">
                    <h3>카드</h3>
                    {user.account ? (
                      <>
                        <div className="card-view">
                          <div>
                            <div className="kv">
                              <span className="k">카드번호</span>
                              <span className="v mono">{maskAccount(user.account)}</span>
                            </div>
                            <div className="kv">
                              <span className="k">CVC</span>
                              <span className="v mono">***</span>
                            </div>
                          </div>
                          <button className="btn danger" onClick={handleDeleteCard}>
                            카드 삭제
                          </button>
                        </div>
                        <small className="help">카드 정보는 수정이 아니라 삭제 후 재등록할 수 있어요.</small>
                      </>
                    ) : (
                      <>
                        <div className="grid two">
                          <label className="field">
                            <span>카드번호</span>
                            <input
                              className={`input ${acctNew && !accountValid ? "err" : ""}`}
                              placeholder="0000-0000-0000-0000"
                              inputMode="numeric"
                              maxLength={19}
                              value={acctNew}
                              onChange={(e) => setAcctNew(formatAccount(e.target.value))}
                            />
                          </label>
                          <label className="field">
                            <span>CVC</span>
                            <input
                              className={`input ${cvcNew && !cvcValid ? "err" : ""}`}
                              placeholder="000"
                              inputMode="numeric"
                              maxLength={3}
                              value={cvcNew}
                              onChange={(e) => setCvcNew(digitsOnly(e.target.value, 3))}
                            />
                          </label>
                        </div>
                        <div className="row-end appear">
                          <button
                            className="btn primary"
                            onClick={handleRegisterCard}
                            disabled={!accountValid || !cvcValid}
                          >
                            {justDeleted ? "카드 재등록" : "카드 등록"}
                          </button>
                        </div>
                      </>
                    )}
                  </section>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 인터랙션 핫스팟 */}
      {phase === "CLOSED" && (
        <button className="hotspot door" aria-label="문 열기" onClick={() => setPhase("OPEN")} />
      )}
      {phase === "OPEN" && (
        <button className="hotspot kong" aria-label="콩쥐에게 다가가기" onClick={() => setPhase("SITTING")} />
      )}
      {phase === "SITTING" && (
        <button className="hotspot paper" aria-label="문서 보기" onClick={() => setPhase("PAPER")} />
      )}

      {/* 하단 힌트 */}
      <div className="hint">
        {phase === "CLOSED" && "문을 클릭하세요"}
        {phase === "OPEN" && "콩쥐를 클릭하세요"}
        {phase === "SITTING" && "콩쥐가 내미는 종이를 클릭하세요"}
        {phase === "PAPER" && "종이에서 정보를 관리하세요"}
      </div>
    </div>
  );
}
