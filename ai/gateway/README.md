# API Gateway Service

통합 API Gateway로 모든 마이크로서비스에 대한 단일 진입점을 제공합니다.

## 주요 기능

- 🚪 **단일 진입점**: 모든 API 요청을 포트 8000으로 통합
- 📚 **통합 문서**: http://localhost:8000/api/ai/docs 에서 모든 API 문서 확인
- 🔍 **서비스 디스커버리**: 활성 서비스 자동 감지
- ❤️ **헬스 체크**: 모든 서비스 상태 모니터링
- 🔄 **자동 프록시**: 요청을 적절한 서비스로 라우팅

## 엔드포인트

### Gateway 관리
- `GET /api/ai` - Gateway 정보 및 서비스 목록
- `GET /api/ai/health` - 모든 서비스 헬스 체크
- `GET /api/ai/services` - 서비스 디스커버리
- `POST /api/ai/refresh-schemas` - API 스키마 갱신

### 프록시 라우팅
Gateway는 다음 서비스들로 요청을 자동 라우팅합니다:

#### Classifier Service (비용 분류)
- `/api/ai/classify/*` → Classifier Service (8001)

#### Data Analysis Service (데이터 분석)  
- `/api/ai/data/*` → Analysis Service (8002)

#### CSV Manager Service (파일 관리)
- `/api/ai/csv/*` → CSV Manager Service (8003)

## 사용 예시

### 통합 API 문서 접근
```bash
# Swagger UI
http://localhost:8000/api/ai/docs

# ReDoc
http://localhost:8000/api/ai/redoc
```

### 헬스 체크
```bash
curl http://localhost:8000/api/ai/health
```

### 비용 분류 (Gateway 경유)
```bash
# 단일 거래 분류
curl "http://localhost:8000/api/ai/classify?merchant=스타벅스&amount=4800&ts=2025-01-17T10:30:00Z"

# CSV 파일 배치 분류
curl -X POST "http://localhost:8000/api/ai/classify?file_id=abc-123-def"

# 분류된 파일 다운로드
curl "http://localhost:8000/api/ai/classify/download?file_id=abc-123-def"
```

### CSV 파일 업로드 (Gateway 경유)
```bash
curl -X POST "http://localhost:8000/api/ai/csv/upload" \
  -H "Authorization: Bearer <token>" \
  -F "file=@transactions.csv"
```

### 데이터 분석 (Gateway 경유)
```bash
curl -X POST "http://localhost:8000/api/ai/data/analyze?file_id=abc-123-def"
```

## 아키텍처

```
Client → Gateway (8000) → Classifier (8001)
                      ↘ Analysis (8002)
                      ↘ CSV Manager (8003)
```

## 개발 노트

- Gateway는 모든 서비스 앞단에서 리버스 프록시 역할
- 내부 서비스는 직접 접근 불가 (포트 비노출)
- 모든 요청은 Gateway를 통해서만 처리
- OpenAPI 스키마를 자동으로 병합하여 통합 문서 제공
- 서비스별 태그로 API 그룹화

## 서비스 목록

| Service | Internal Port | Path Prefix | Description |
|---------|--------------|-------------|-------------|
| Classifier | 8001 | `/api/ai/classify` | 비용 분류 |
| Analysis | 8002 | `/api/ai/data` | 데이터 분석 |
| CSV Manager | 8003 | `/api/ai/csv` | 파일 관리 |