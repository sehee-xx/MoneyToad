# API Gateway Service

통합 API Gateway로 모든 마이크로서비스에 대한 단일 진입점을 제공합니다.

## 주요 기능

- 🚪 **단일 진입점**: 모든 API 요청을 포트 8000으로 통합
- 📚 **통합 문서**: http://localhost:8000/docs 에서 모든 API 문서 확인
- 🔍 **서비스 디스커버리**: 활성 서비스 자동 감지
- ❤️ **헬스 체크**: 모든 서비스 상태 모니터링
- 🔄 **자동 프록시**: 요청을 적절한 서비스로 라우팅

## 엔드포인트

### Gateway 관리
- `GET /` - Gateway 정보 및 서비스 목록
- `GET /health` - 모든 서비스 헬스 체크
- `GET /services` - 서비스 디스커버리
- `GET /metrics` - 기본 메트릭

### Classifier Service (비용 분류)
- `GET /ai/classify` - 단일 거래 분류
- `POST /ai/classify` - 배치 CSV 분류
- `GET /ai/classify/status` - 작업 상태 확인
- `GET /ai/classify/download` - 결과 다운로드

### Analysis Service (데이터 분석)
- `POST /ai/analysis/spending-patterns` - 지출 패턴 분석
- `POST /ai/analysis/budget-recommendations` - 예산 추천
- `POST /ai/analysis/anomalies` - 이상 거래 탐지
- `POST /ai/analysis/trends` - 트렌드 분석
- `POST /ai/analysis/insights` - AI 인사이트

## 사용 예시

### 통합 API 문서 접근
```bash
# Swagger UI
http://localhost:8000/docs

# ReDoc
http://localhost:8000/redoc
```

### 헬스 체크
```bash
curl http://localhost:8000/health
```

### 비용 분류 (Gateway 경유)
```bash
curl "http://localhost:8000/ai/classify?merchant=스타벅스&amount=4800"
```

### 지출 분석 (Gateway 경유)
```bash
curl -X POST "http://localhost:8000/ai/analysis/spending-patterns" \
  -H "Content-Type: application/json" \
  -d '{"transactions": [...], "period": "monthly"}'
```

## 아키텍처

```
Client → Gateway (8000) → Classifier (8001)
                      ↘ Analysis (8002)
                      ↘ Redis (6379)
```

## 개발 노트

- Gateway는 모든 서비스 앞단에서 리버스 프록시 역할
- 내부 서비스는 직접 접근 불가 (포트 비노출)
- 모든 요청은 Gateway를 통해서만 처리
- 서비스 간 통신도 Gateway 활용 가능