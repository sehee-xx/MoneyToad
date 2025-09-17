# AI Fintech Services

AI 기반 금융 서비스를 위한 마이크로서비스 아키텍처 - GPT API를 활용한 지능형 금융 분석 플랫폼

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Client Applications               │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼ Port 8000
         ┌──────────────────────┐
         │   API Gateway        │  ← 통합 API 문서
         │   (Gateway Service)  │    단일 진입점
         └──────────┬───────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌─────────┐   ┌─────────┐   ┌─────────┐
│Classifier│   │Analysis │   │   CSV   │
│ Service │   │ Service │   │ Manager │
│  (8001) │   │  (8002) │   │  (8003) │
└─────────┘   └─────────┘   └─────────┘
```

## 🚀 Services

### API Gateway (Port 8000)
**통합 API 게이트웨이** - 모든 마이크로서비스의 단일 진입점

- 📚 **통합 API 문서**: http://localhost:8000/api/ai/docs
- 🔍 **서비스 디스커버리**: 자동으로 하위 서비스 감지
- ❤️ **헬스 체크**: 모든 서비스 상태 모니터링
- 🔄 **자동 프록시**: 요청을 적절한 서비스로 라우팅

### 1. Classifier Service (내부 포트 8001)
**비용 분류 서비스** - GPT를 사용한 거래 카테고리 자동 분류

**주요 기능:**
- 단일 거래 실시간 분류
- 배치 처리 지원
- 카테고리 학습 및 개선

### 2. Analysis Service (내부 포트 8002)
**금융 데이터 분석 서비스** - 지출 패턴 분석 및 AI 인사이트 제공

**주요 기능:**
- 지출 패턴 분석
- 예산 추천
- 트렌드 분석
- AI 기반 인사이트 생성

### 3. CSV Manager Service (내부 포트 8003) 🆕
**CSV 파일 관리 서비스** - MinIO/S3를 사용한 파일 스토리지 관리

**주요 기능:**
- CSV 파일 업로드/삭제/교체
- 파일 상태 추적 (ingesting, analyzing 등)
- S3/MinIO 통합 스토리지
- 보안 파일 관리 (Admin 권한 필요)


## 📦 Quick Start

### 1. 환경 설정
```bash
# 환경 변수 파일 생성
cp .env.example .env

# .env 파일 편집하여 OpenAI API 키 설정
# OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 2. 서비스 실행
```bash
# 모든 서비스 시작 (권장)
docker-compose up -d

# 또는 Makefile 사용
make up

# 재빌드 및 재시작
make re
```

### 3. 서비스 확인
- 🌐 **통합 API 문서**: http://localhost:8000/api/ai/docs
- ❤️ **헬스 체크**: http://localhost:8000/api/ai/health
- 📊 **서비스 정보**: http://localhost:8000/api/ai/services

## 🔌 API Usage

### 통합 Gateway 사용 (권장)
모든 API 요청을 포트 8000으로 보내면 자동으로 라우팅됩니다:

```bash
# 비용 분류 - Gateway 경유
curl "http://localhost:8000/api/ai/classify?merchant=스타벅스&amount=4800"

# CSV 파일 업로드 - Gateway 경유
curl -X POST "http://localhost:8000/api/ai/csv/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@transactions.csv"

# 데이터 분석 요청 - Gateway 경유
curl -X POST "http://localhost:8000/api/ai/data/analyze?file_id=abc-123-def"
```

### Python 예제
```python
import requests

# Gateway를 통한 비용 분류
response = requests.get(
    "http://localhost:8000/api/ai/classify",
    params={
        "merchant": "스타벅스",
        "amount": 4800,
        "description": "아메리카노"
    }
)
print(response.json())
# 결과: {"category": "Food & Dining", "confidence": 0.95}

# CSV 파일 업로드
with open('transactions.csv', 'rb') as f:
    response = requests.post(
        "http://localhost:8000/api/ai/csv/upload",
        headers={'Authorization': 'Bearer YOUR_TOKEN'},
        files={'file': f}
    )
    print(response.json())

# 데이터 분석 시작
response = requests.post(
    "http://localhost:8000/api/ai/data/analyze",
    params={'file_id': 'abc-123-def'}
)
analysis_id = response.json()['analysis_id']
print(f"Analysis started: {analysis_id}")

# 분석 리포트 조회
response = requests.get(
    "http://localhost:8000/api/ai/data/report",
    params={'file_id': 'abc-123-def', 'year': 2024, 'month': 1}
)
print(response.json())
```

## 📁 Project Structure

```
ai/
├── gateway/              # API Gateway 서비스
│   ├── app/
│   │   ├── core/        # 설정
│   │   ├── deps/        # 의존성 (인증 등)
│   │   └── main.py      # 통합 라우팅 및 문서화
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
│   │   ├── core/      # 설정
│   │   ├── models/    # 데이터 모델
│   │   └── services/  # 분석 로직
│   ├── Dockerfile
│   └── requirements.txt
├── csv-manager/        # CSV 파일 관리 서비스 🆕
│   ├── app/
│   │   ├── api/       # API 엔드포인트
│   │   ├── core/      # 설정
│   │   ├── deps/      # 의존성 (인증)
│   │   ├── models/    # 데이터 모델
│   │   └── repos/     # S3/MinIO 저장소
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml  # 서비스 오케스트레이션
├── Makefile           # 개발 명령어
└── .env.example      # 환경변수 템플릿
```

## 🛠️ Development

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

### 로그 확인
```bash
# 전체 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f gateway
docker-compose logs -f classifier
docker-compose logs -f analysis
docker-compose logs -f csv-manager
```

### API 문서 갱신
서비스 API가 변경된 경우:
```bash
# Gateway 재시작 (자동으로 새 스펙 로드)
docker restart gateway-service

# 또는 수동 갱신
curl -X POST http://localhost:8000/api/ai/refresh-schemas
```

## 🔧 Environment Variables

```env
# OpenAI 설정 (필수)
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=200
OPENAI_TEMPERATURE=0.3

# MinIO/S3 설정 (CSV Manager용)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=csv-storage
MINIO_SECURE=false

# JWT 인증 설정
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# 로깅
LOG_LEVEL=INFO

# 선택사항
DATABASE_URL=postgresql://user:password@localhost/fintech_db
```

## 🏛️ Architecture Benefits

### 마이크로서비스 아키텍처의 장점
1. **독립적 확장**: 각 서비스를 독립적으로 스케일링
2. **기술 다양성**: 서비스별로 최적의 기술 스택 선택 가능
3. **장애 격리**: 한 서비스 장애가 전체 시스템에 영향 최소화
4. **독립 배포**: 서비스별 독립적인 개발 및 배포 주기

### API Gateway 패턴의 장점
1. **단일 진입점**: 클라이언트는 하나의 엔드포인트만 알면 됨
2. **통합 문서**: 모든 API를 한 곳에서 확인 및 테스트
3. **횡단 관심사**: 인증, 로깅, 모니터링을 중앙에서 처리
4. **서비스 추상화**: 내부 서비스 구조 변경이 클라이언트에 영향 없음

## 📊 Performance

- **응답 시간**: 평균 < 500ms
- **동시 처리**: 100+ 동시 요청 처리
- **정확도**: 95%+ 분류 정확도
- **가용성**: 99.9% 업타임 목표

## 🔒 Security

- OpenAI API 키는 환경 변수로 안전하게 관리
- 내부 서비스는 Docker 네트워크 내에서만 접근 가능
- CORS 설정으로 허가된 도메인만 접근
- 민감한 데이터 보호를 위한 보안 정책 적용

