# 🚀 AI Fintech System - 지능형 금융 데이터 분석 플랫폼

## 📌 프로젝트 개요

**AI 기반 금융 거래 분석 및 예측 시스템**으로, 사용자의 거래 내역을 자동으로 분류하고 미래 지출을 예측하는 마이크로서비스 아키텍처 기반 플랫폼입니다.

### 핵심 가치
- 🎯 **정확한 거래 분류**: AI 기반 자동 카테고리 분류 (13개 카테고리)
- 📊 **지출 예측**: Facebook Prophet을 활용한 시계열 예측
- 🎮 **기준값 분석**: 월별 소비 기준 금액 제공
- ⚡ **실시간 처리**: 비동기 대용량 데이터 처리
- 🔄 **확장 가능**: 마이크로서비스 아키텍처

## 🏗 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Applications                    │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼ Port 8000
              ┌─────────────────────────┐
              │     API Gateway         │
              │   (통합 진입점/라우팅)    │
              └────┬────┬────┬──────────┘
                   │    │    │
      ┌────────────┴────┼────┴────────────┐
      │                 │                 │
      ▼                 ▼                 ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│Classifier│      │ Analysis │      │   CSV    │
│ Service  │      │ Service  │      │ Manager  │
│          │      │          │      │ Service  │
│  (GPT)   │      │(Prophet) │      │          │
└────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │
     └─────────┬───────┴───────┬─────────┘
               │               │
        ┌──────▼──────┐ ┌──────▼──────┐
        │   MinIO/S3  │ │    Redis    │
        │  (Storage)  │ │   (Cache)   │
        └─────────────┘ └─────────────┘
               │
        ┌──────▼──────┐
        │    MySQL    │
        │  (Database) │
        └─────────────┘
```

## 📦 서비스 구성

### 1. **API Gateway** (Port: 8000)
- 통합 API 진입점
- 요청 라우팅 및 프록시
- Swagger UI 통합 제공
- 서비스 헬스 체크

### 2. **Classifier Service** (내부)
- OpenAI GPT 기반 거래 분류
- 13개 지출 카테고리 자동 분류
- 배치 처리 최적화
- 정확도 95% 이상

### 3. **Analysis Service** (내부)
- Facebook Prophet 시계열 예측
- 카테고리별 지출 예측
- 기준값(Baseline) 계산
- 트렌드 분석

### 4. **CSV Manager Service** (내부)
- CSV 파일 업로드/관리
- MinIO/S3 통합
- 파일 상태 추적
- 메타데이터 관리

## 🚦 상태 관리 시스템

### 4-State 시스템
```
┌──────────┐     ┌────────────┐     ┌────────────┐     ┌──────┐
│ uploading│────▶│ ingesting  │────▶│ analyzing  │────▶│ none │
└──────────┘     └────────────┘     └────────────┘     └──────┘
     │                  │                  │                │
     └──────────────────┴──────────────────┴────────────────┘
                              ▼
                           [ none ]
```

| 상태 | 설명 | 다음 가능 상태 |
|------|------|--------------| 
| `none` | 유휴 상태 (초기/완료/오류) | `uploading`, `analyzing` |
| `uploading` | 파일 업로드 중 | `ingesting`, `none` |
| `ingesting` | 데이터 처리 중 | `none` |
| `analyzing` | AI 분석 중 | `none` |

## 🎯 주요 기능

### 1. CSV 파일 처리
```bash
# 파일 업로드
POST /api/ai/csv/upload
Content-Type: multipart/form-data
file: transactions.csv

# 상태 확인
GET /api/ai/csv/status?file_id={file_id}
```

### 2. 거래 분류
```bash
# 분류 시작
POST /api/ai/classify/process?file_id={file_id}

# 분류 결과 조회
GET /api/ai/classify/result?file_id={file_id}
```

### 3. 지출 예측
```bash
# 분석 시작
POST /api/ai/data?file_id={file_id}

# 예측 결과 조회
GET /api/ai/data/leak?file_id={file_id}&year=2025&month=9

# 기준값 조회 (1월~현재)
GET /api/ai/data/baseline?file_id={file_id}
```

## 📊 기준값 예측 (Baseline Predictions)

### 개념
**소비 기준 금액**: 1월부터 현재월까지 각 월별로 그 이전 데이터만 사용하여 계산한 예상 지출액

### 구현 방식
```python
# 예: 9월 현재
1월 기준값: 전년 12월까지 데이터로 1월 예측
2월 기준값: 1월까지 데이터로 2월 예측
...
8월 기준값: 7월까지 데이터로 8월 예측
9월 예측: 8월까지 데이터로 9월 예측 (현재월)
```

### API 응답 예시
```json
{
  "file_id": "test-001",
  "baseline_months": [
    {
      "year": 2025,
      "month": 1,
      "total_predicted": 1100431.42,
      "categories_count": 13,
      "training_data_until": "2024-12-31"
    },
    ...
  ]
}
```

## 📈 지원 카테고리 (13개)

| 카테고리 | 설명 | 예측 모델 특성 |
|---------|------|--------------|
| 식비 | 일반 식사 | 주간 계절성 강함 |
| 교통/차량 | 대중교통, 주유 | 월간 패턴 |
| 마트/편의점 | 생필품 구매 | 주간 패턴 |
| 온라인쇼핑 | 이커머스 | 이벤트 기반 |
| 카페/간식 | 카페, 디저트 | 주간 계절성 |
| 의료/건강 | 병원, 약국 | 비정기적 |
| 문화/여가 | 영화, 공연 | 주말 집중 |
| 생활 | 공과금, 통신 | 월간 고정 |
| 뷰티/미용 | 화장품, 미용실 | 월간 패턴 |
| 여행/숙박 | 호텔, 항공 | 계절성 |
| 교육 | 학원, 강의 | 분기별 |
| 술/유흥 | 주점, 클럽 | 주말 집중 |
| 기타 | 미분류 | 랜덤 |

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- 8GB+ RAM
- OpenAI API Key (for Classifier)

### 1. 환경 설정
```bash
# .env 파일 생성
cat > .env << EOF
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# MySQL
MYSQL_DATABASE=fintech_ai
MYSQL_USER=fintech
MYSQL_PASSWORD=fintech123
MYSQL_ROOT_PASSWORD=root123

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
S3_BUCKET_NAME=csv-uploads

# Service URLs
CLASSIFIER_SERVICE_URL=http://classifier:8001
ANALYSIS_SERVICE_URL=http://analysis:8002
CSV_MANAGER_SERVICE_URL=http://csv-manager:8003
EOF
```

### 2. 시스템 시작
```bash
# 전체 서비스 시작
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f
```

### 3. API 접속
- **Swagger UI**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **Service Status**: http://localhost:8000/services/status

## 📝 API 사용 예시

### 전체 플로우
```bash
# 1. CSV 파일 업로드
curl -X POST "http://localhost:8000/api/ai/csv/upload" \
  -F "file=@transactions.csv"

# Response: {"file_id": "abc-123", "status": "uploading"}

# 2. 거래 분류 실행
curl -X POST "http://localhost:8000/api/ai/classify/process?file_id=abc-123"

# 3. 상태 확인 (분류 완료 대기)
curl "http://localhost:8000/api/ai/csv/status?file_id=abc-123"

# 4. 예측 분석 시작
curl -X POST "http://localhost:8000/api/ai/data?file_id=abc-123"

# 5. 예측 결과 조회
curl "http://localhost:8000/api/ai/data/leak?file_id=abc-123&year=2025&month=9"

# 6. 기준값 조회
curl "http://localhost:8000/api/ai/data/baseline?file_id=abc-123"
```

### Python 예제
```python
import requests
from datetime import datetime

# Gateway를 통한 단일 거래 분류
response = requests.get(
    "http://localhost:8000/api/ai/classify",
    params={
        "merchant": "스타벅스",
        "amount": 4800,
        "ts": datetime.now().isoformat()
    }
)
print(response.json())
# 결과: {"category": "카페/간식", "confidence": 0.95}

# CSV 파일 업로드
with open('transactions.csv', 'rb') as f:
    response = requests.post(
        "http://localhost:8000/api/ai/csv/upload",
        files={'file': f}
    )
    file_id = response.json()['file_id']
    print(f"File uploaded: {file_id}")

# 배치 분류 시작
response = requests.post(
    f"http://localhost:8000/api/ai/classify/process?file_id={file_id}"
)
print("Classification started")

# 분석 시작
response = requests.post(
    f"http://localhost:8000/api/ai/data?file_id={file_id}"
)
print("Analysis started")

# 예측 결과 조회
response = requests.get(
    f"http://localhost:8000/api/ai/data/leak?file_id={file_id}"
)
print(response.json())
```

## 🗄 데이터베이스 스키마

### predictions 테이블
```sql
CREATE TABLE predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_id VARCHAR(255),
    category VARCHAR(100),
    prediction_date DATE,
    predicted_amount DECIMAL(15,2),
    lower_bound DECIMAL(15,2),
    upper_bound DECIMAL(15,2)
);
```

### baseline_predictions 테이블
```sql
CREATE TABLE baseline_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_id VARCHAR(255),
    category VARCHAR(100),
    year INT,
    month INT,
    predicted_amount DECIMAL(15,2),
    training_cutoff_date DATE
);
```

## 📊 모니터링 & 로깅

### 헬스체크 엔드포인트
```bash
# Gateway 헬스
GET /health

# 개별 서비스 헬스
GET /services/health

# 상세 상태
GET /services/status
```

### 로그 확인
```bash
# 전체 로그
docker-compose logs

# 특정 서비스 로그
docker-compose logs analysis

# 실시간 로그
docker-compose logs -f --tail=100
```

## 🔧 트러블슈팅

### 문제: Redis 연결 실패
```bash
# Redis 재시작
docker-compose restart redis

# 연결 테스트
docker exec redis-cache redis-cli ping
```

### 문제: MySQL 연결 실패
```bash
# DB 재시작
docker-compose restart mysql

# 연결 테스트
docker exec mysql-db mysqladmin ping -u root -proot123
```

### 문제: MinIO 업로드 실패
```bash
# MinIO 상태 확인
docker-compose logs minio

# 버킷 생성 확인
docker exec minio mc ls local/
```

## 📈 성능 최적화

### 1. 병렬 처리
- ThreadPoolExecutor 4 workers
- 카테고리별 독립 모델 학습
- 배치 처리 최적화

### 2. 캐싱 전략
- Redis TTL 24시간
- 예측 결과 캐싱
- 메타데이터 캐싱

### 3. 데이터베이스 인덱싱
```sql
CREATE INDEX idx_predictions_file_category ON predictions(file_id, category);
CREATE INDEX idx_baseline_file_category ON baseline_predictions(file_id, category);
```

## 🐛 디버깅

### 디버그 모드 활성화
```bash
# docker-compose.yml 수정
environment:
  - LOG_LEVEL=DEBUG
  - PYTHONDEBUG=1
```

### 개별 서비스 테스트
```bash
# Classifier 테스트
docker exec classifier-service python -m pytest

# Analysis 테스트
docker exec analysis-service python -m pytest
```

## 🔒 보안

### API Key 관리
- 환경 변수로 관리
- .env 파일 git ignore
- Docker secrets 사용 권장

### 네트워크 격리
- 내부 서비스 외부 접근 차단
- Gateway만 외부 노출
- 서비스간 내부 네트워크 통신

## 📚 기술 스택

### Backend
- **FastAPI**: 비동기 웹 프레임워크
- **Prophet**: 시계열 예측
- **OpenAI GPT**: 거래 분류
- **SQLAlchemy**: ORM

### Infrastructure
- **Docker**: 컨테이너화
- **MySQL**: 메인 데이터베이스
- **Redis**: 캐싱 & 상태 관리
- **MinIO**: S3 호환 스토리지

### Monitoring
- **Health Checks**: 서비스 상태 모니터링
- **Logging**: 구조화된 로깅
- **Metrics**: 성능 지표 수집

## 🛠 개발 도구

### Makefile 명령어
```bash
make help         # 사용 가능한 명령어 확인
make up          # 서비스 시작
make down        # 서비스 중지
make re          # 재빌드 및 재시작
make logs        # 로그 확인
make test        # 테스트 실행
make clean       # 정리
```

### 환경 변수 (.env)
```bash
# OpenAI 설정 (필수)
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=200
OPENAI_TEMPERATURE=0.3

# MySQL
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DATABASE=fintech_ai
MYSQL_USER=fintech
MYSQL_PASSWORD=fintech123
MYSQL_ROOT_PASSWORD=root123

# Redis (로컬 컨테이너 사용)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# MinIO/S3
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=csv-uploads

# Service
SERVICE_PORT=8000
LOG_LEVEL=INFO
```

## 📁 프로젝트 구조

```
ai/
├── gateway/              # API Gateway 서비스
│   ├── app/
│   │   ├── core/        # 설정
│   │   ├── deps/        # 의존성 (인증 등)
│   │   └── main.py      # 통합 라우팅
│   ├── Dockerfile
│   └── requirements.txt
├── classifier/          # 비용 분류 서비스
│   ├── app/
│   │   ├── api/        # API 엔드포인트
│   │   ├── core/       # 설정 및 핵심 로직
│   │   ├── models/     # 데이터 모델
│   │   └── services/   # GPT 분류 서비스
│   ├── Dockerfile
│   └── requirements.txt
├── analysis/           # 데이터 분석 서비스
│   ├── app/
│   │   ├── api/       # API 엔드포인트
│   │   ├── db/        # 데이터베이스
│   │   ├── models/    # 데이터 모델
│   │   └── services/  # Prophet 예측
│   ├── Dockerfile
│   └── requirements.txt
├── csv-manager/        # CSV 파일 관리 서비스
│   ├── app/
│   │   ├── api/       # API 엔드포인트
│   │   ├── core/      # 설정
│   │   ├── models/    # 데이터 모델
│   │   └── services/  # S3/Redis 서비스
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml  # 서비스 오케스트레이션
├── Makefile           # 개발 명령어
└── .env              # 환경 변수
```

## 🚧 개발 로드맵

### Phase 1 (완료) ✅
- [x] 기본 마이크로서비스 구조
- [x] CSV 파일 처리
- [x] 거래 분류 (GPT)
- [x] 지출 예측 (Prophet)
- [x] 기준값 계산

### Phase 2 (진행중) 🚀
- [ ] 실시간 알림 시스템
- [ ] 웹 대시보드
- [ ] 고급 예측 모델
- [ ] 멀티 유저 지원

### Phase 3 (계획) 📋
- [ ] 모바일 앱 연동
- [ ] 외부 은행 API 연동
- [ ] AI 추천 시스템
- [ ] 자동 예산 관리

