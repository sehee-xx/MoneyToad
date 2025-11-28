# 돈꺼비 (MoneyToad) - AI 소비 패턴 분석 및 절약 추천 서비스

<div align="center">

![MoneyToad](https://img.shields.io/badge/MoneyToad-AI%20Financial%20Assistant-4CAF50?style=for-the-badge)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Vector DB](https://img.shields.io/badge/Vector_DB-FF6B6B?style=for-the-badge)

</div>

---

## 목차

- [프로젝트 소개](#프로젝트-소개)
- [기획 배경](#기획-배경)
- [서비스 화면](#서비스-화면)
- [주요 기술](#주요-기술)
- [핵심 기능](#핵심-기능)
- [특장점](#특장점)
- [팀원 소개](#팀원-소개)

---

## 프로젝트 소개

**돈꺼비(MoneyToad)**는 **교육지원금 100만원을 효율적으로 관리**하기 위한 **AI 기반 소비 패턴 분석 및 절약 추천 슈퍼앱**입니다.

### 🐸 돈꺼비의 의미

> **"부의 상징, 두꺼비"** + **"깨진 장독대를 막는 콩쥐팥쥐 전설"**

- **두꺼비**: 전통적으로 부와 재물을 상징
- **장독대**: 소중한 재산(교육지원금)
- **누수**: 매일매일 줄줄 새는 불필요한 지출
- **장독대를 막는 두꺼비**: AI가 여러분의 지출 누수를 막아드립니다!

### 🎯 핵심 가치

**"매일매일 줄줄 새는 교육지원금, 어떻게 관리할까요?"**

- **AI 자동 카테고리 분류**: 카드 내역을 입력하면 AI가 자동으로 분류 (정확도 99%)
- **소비 패턴 분석**: 나도 몰랐던 소비 습관을 AI가 분석
- **맞춤형 절약 추천**: 개인별 소비 패턴에 맞춘 절약 방법 제시
- **직관적 시각화**: 장독대와 누수로 표현하는 쉬운 재무 현황

---

## 기획 배경

### 🔴 Problem: 교육지원금 관리의 어려움

**교육지원금 100만원이 매일매일 줄줄 새요.. 어떡하면 좋을까요?**

#### 주요 문제점

1. **어려운 재무 용어**
   - 복잡한 금융 용어로 인한 진입 장벽
   - 재무 관리의 필요성은 느끼지만 실천이 어려움

2. **소비 내역 파악의 번거로움**
   - 수동으로 입력하고 분류하는 것이 귀찮음
   - 어디에 얼마나 썼는지 정확히 모름

3. **효과적인 절약 방법을 모름**
   - 개인에게 맞는 절약 방법을 찾기 힘듦
   - 일반적인 팁은 실효성이 떨어짐

### 💡 Solution: AI가 모든 것을 분석해드립니다!

- **카드번호만 입력**하면 끝!
- AI가 **자동으로 카테고리 분류**
- AI가 **소비 패턴을 분석**하고
- **맞춤형 절약 방법을 추천**

---

## 서비스 화면

### 누수 장독대 화면
<img width="478" height="235" alt="image" src="https://github.com/user-attachments/assets/df15ece9-5084-40d4-ab21-7c5100f30728" />

### 연간, 월간 소비 차트 화면
<img width="478" height="235" alt="image" src="https://github.com/user-attachments/assets/b4d443c9-e75f-4335-970c-43ffc13085f5" />

### 카테고리별 AI 절약 추천 화면
<img width="478" height="235" alt="image" src="https://github.com/user-attachments/assets/0bbdb86c-6898-4840-a1db-4f3f43ac65bd" />

---

## 주요 기술

### 슈퍼앱 구조

**3가지 핵심 AI 기술**

1. **AI 카테고리 분류** (정확도 99%)
2. **AI 소비 패턴 분석** (Vector DB + LLM)
3. **AI 절약 방법 추천** (Distillation)

### 기술 스택

#### Frontend
![React Native](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)

#### Backend
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=flat-square&logo=spring-boot&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)

#### AI
![Vector DB](https://img.shields.io/badge/Vector_DB-FF6B6B?style=flat-square)
![LLM](https://img.shields.io/badge/LLM-4CAF50?style=flat-square)
![Chain of Thought](https://img.shields.io/badge/Chain_of_Thought-2196F3?style=flat-square)

---

## 시스템 아키텍처


## 핵심 기능

### 1️⃣ AI 카테고리 분류 (정확도 99%)

#### 문제점
- **키워드 기반 분류**: 정확도 75%로 부족
- **오분류 사례**:
  - "몸짱약사 민재원" → "여가" (실제: 의료)
  - "쿠키살롱" → "카페" (실제: 미용)

#### 해결: Vector DB + LLM

**처리 과정**
```
가맹점명 입력
    ↓
Vector Embedding (고차원 벡터 변환)
    ↓
Vector DB 유사도 검색
    ↓
LLM 최종 판단
    ↓
카테고리 분류 (정확도 99%)
```

**개선 결과**
- "몸짱약사 민재원" → **"의료"** ✅
- "쿠키살롱" → **"미용"** ✅

**성과**: 75% → 99% (24%p 향상)

---

### 2️⃣ AI 소비 패턴 분석

#### Vector DB + LLM + Chain of Thought

**Chain of Thought (생각의 사슬)**
- AI가 단계적으로 논리를 전개하며 분석
- 단순 통계가 아닌 맥락 기반 인사이트 제공

**분석 항목**
1. 카테고리별 지출 비중 및 트렌드
2. 시간대/요일별 소비 패턴
3. 자주 방문하는 가맹점 분석
4. 전월 대비 증감 분석

**예시**
```
단순 분석:
"외식비가 많습니다"

Chain of Thought 분석:
"전체 소비 중 외식비가 45%를 차지합니다.
일반적인 외식비 비중(25~30%)보다 15%p 높으며,
주로 주말 저녁 고급 레스토랑에서 지출됩니다.
→ 주말 외식 빈도를 줄이고 홈쿡을 늘려보세요"
```

---

### 3️⃣ AI 절약 방법 추천

#### Distillation (지식 증류)

**Teacher Model → Student Model**
- 대형 모델(GPT-4)의 지식을 경량 모델로 전이
- 빠른 추론 속도 + 낮은 비용

**추천 알고리즘**
1. 개인 소비 패턴 매칭
2. 유사 사용자 그룹의 효과적인 절약 사례 추출
3. 실천 가능한 맞춤형 방법 제시

**예시**
```
분석: 주 5회 카페 방문, 월 15만원

추천:
1. 텀블러 사용으로 할인받기 (월 3만원 절약)
2. 주 3회로 줄이고 홈카페 활용 (월 6만원 절약)
3. 카페 구독 서비스 이용 (월 5만원 절약)

→ 실천 시 월 최대 14만원 절약 가능!
```

---

## 특장점

### 🎨 누수를 장독대로 표현

**전통적 이미지 + 현대적 감각**

- **장독대**: 교육지원금 100만원
- **새는 물**: 일별/주별/월별 소비 금액 시각화
- **두꺼비**: AI 절약 도우미 캐릭터

**직관적인 재무 현황 파악**
- 복잡한 숫자 대신 시각적으로 한눈에
- 재미있고 친근한 인터페이스

---

### 📊 월별 소비 내역 시각화

**카테고리별 색상 구분**
- 식비: 주황색
- 교통: 파란색  
- 여가: 초록색
- 쇼핑: 분홍색

**다양한 차트 제공**
- 원형 차트: 카테고리별 비중
- 막대 차트: 월별/주별 트렌드
- 라인 차트: 일별 소비 변화

---

### 🤖 AI 소비 패턴 분석 및 절약 방법 추천

**3단계 AI 파이프라인**

1. **자동 분류** (Classifier)
   - Vector DB + LLM
   - 정확도 99%

2. **패턴 분석** (Analysis)
   - Chain of Thought
   - 맥락 기반 인사이트

3. **맞춤 추천** (Recommendation)
   - Distillation
   - 실천 가능한 방법

---

## 팀원 소개

<div align="center">

| 역할 | 이름 | GitHub | 담당 업무 |
|:---:|:---:|:---:|:---:|
| **팀장 / Infra** | 손기민 | [@KiminSon](https://github.com/KiminSon) | 인프라 구축 / 발표 |
| **BE** | 김윤수 | [@rladbstn1000](https://github.com/rladbstn1000) | API 구현 |
| **AI** | 조민재 | [@minjcho](https://github.com/minjcho) | AI 구현 |
| **FE** | 김동진 | [@terrydkim](https://github.com/terrydkim) | API 연동 / FE 인프라 |
| **FE** | 양세희 | [@sehee-xx](https://github.com/sehee-xx) | UI/UX 구현 |

</div>

---

<div align="center">

**돈꺼비** - AI가 여러분의 지출 누수를 막아드립니다!

[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/your-repo)

</div>
