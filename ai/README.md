# AI Fintech Services

Simple microservices for AI-powered financial services using GPT API.

## Services

### 1. Classifier Service (Port 8001)
비용 분류 서비스 - GPT를 사용한 거래 카테고리 자동 분류

**Endpoints:**
- `GET /ai/classify` - 단일 거래 분류
- `POST /ai/classify` - 배치 CSV 분류  
- `GET /ai/classify/status` - 작업 상태 확인
- `GET /ai/classify/download` - 결과 다운로드

**Example:**
```bash
curl "http://localhost:8001/ai/classify?merchant=스타벅스&amount=4800"
```

### 2. Analysis Service (Port 8002)
금융 데이터 분석 서비스 - 지출 패턴 분석 및 인사이트 제공

**Endpoints:**
- `POST /api/v1/analysis/spending-patterns` - 지출 패턴 분석
- `POST /api/v1/analysis/budget-recommendations` - 예산 추천
- `POST /api/v1/analysis/anomalies` - 이상 거래 탐지
- `POST /api/v1/analysis/trends` - 트렌드 분석
- `POST /api/v1/analysis/insights` - AI 인사이트 생성

## Quick Start

### 1. 환경 설정
```bash
cp .env.example .env
# OpenAI API 키 설정 필요
```

### 2. 서비스 실행
```bash
# 모든 서비스 시작
docker-compose up -d

# 특정 서비스만 시작
docker-compose up classifier
docker-compose up analysis
```

### 3. 서비스 확인
- Classifier: http://localhost:8001
- Analysis: http://localhost:8002
- Redis: localhost:6379

## Environment Variables

```env
# OpenAI 설정
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4-turbo-preview

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

## API Examples

### 비용 분류
```python
# 단일 거래 분류
response = requests.get(
    "http://localhost:8001/ai/classify",
    params={
        "merchant": "스타벅스",
        "amount": 4800,
        "description": "아메리카노"
    }
)
# 결과: {"category": "Food & Dining", "confidence": 0.95}
```

### 지출 분석
```python
# 지출 패턴 분석
response = requests.post(
    "http://localhost:8002/api/v1/analysis/spending-patterns",
    json={
        "transactions": [...],
        "period": "monthly"
    }
)
# 결과: 카테고리별 분석, 주요 가맹점, 지출 속도 등
```

## Project Structure

```
.
├── classifier/           # 비용 분류 서비스
│   ├── app/
│   ├── Dockerfile
│   └── requirements.txt
├── analysis/            # 데이터 분석 서비스
│   ├── app/
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml   # 서비스 오케스트레이션
└── .env.example        # 환경변수 템플릿
```

## Development

```bash
# 로그 확인
docker-compose logs -f classifier
docker-compose logs -f analysis

# 서비스 재시작
docker-compose restart classifier

# 테스트
make test

# 정리
docker-compose down
```

## License

MIT