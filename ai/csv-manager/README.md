# CSV Manager Service

CSV 파일 관리를 위한 독립적인 마이크로서비스 - MinIO/S3 스토리지를 사용한 보안 파일 관리

## 🎯 Overview

CSV Manager는 금융 데이터 CSV 파일의 업로드, 저장, 상태 관리를 담당하는 전용 서비스입니다. 
MinIO 또는 AWS S3와 통합되어 안전하고 확장 가능한 파일 스토리지를 제공합니다.

## ✨ Features

### 파일 관리
- **업로드**: CSV 파일을 안전하게 업로드 및 저장
- **교체**: 기존 파일을 새 버전으로 교체
- **삭제**: 파일 및 관련 메타데이터 완전 제거
- **상태 추적**: 파일 처리 상태 모니터링

### 보안
- JWT 기반 인증
- Role 기반 접근 제어 (Admin/User)
- SHA-256 체크섬 검증
- Presigned URL을 통한 안전한 다운로드

### 스토리지
- MinIO/S3 호환 스토리지
- 자동 버킷 생성 및 관리
- 메타데이터 추적
- 파일 버전 관리

## 🚀 API Endpoints

### 파일 업로드
```bash
POST /api/ai/csv/upload
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

# Request
file: transactions.csv

# Response
{
  "csv_file": "transactions.csv",
  "file_id": "uuid-1234",
  "checksum": "sha256hash...",
  "size_bytes": 1024,
  "uploaded_at": "2024-01-01T00:00:00Z",
  "s3_key": "uuid-1234_transactions.csv",
  "s3_url": "https://..."
}
```

### 파일 삭제
```bash
DELETE /api/ai/csv/delete?file_id=abc-123
Authorization: Bearer <admin_token>

# Response: 204 No Content
```

### 파일 교체
```bash
PUT /api/ai/csv/change?file_id=abc-123
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

# Request
file: new_transactions.csv

# Response
{
  "csv_file": "transactions.csv",
  "file_id": "uuid-5678",
  "replaced_at": "2024-01-02T00:00:00Z",
  ...
}
```

### 상태 확인
```bash
GET /api/ai/csv/status?file_id=abc-123
Authorization: Bearer <user_token>

# Response
{
  "csv_file": "transactions.csv",
  "status": "ingesting",  // or "analyzing", "none"
  "progress": null,
  "last_updated": "2024-01-01T00:00:00Z"
}
```

## 📁 Project Structure

```
csv-manager/
├── app/
│   ├── api/
│   │   └── endpoints/
│   │       └── csv.py         # CSV 관련 엔드포인트
│   ├── core/
│   │   └── config.py         # 환경 설정
│   ├── deps/
│   │   └── auth.py          # 인증 의존성
│   ├── models/
│   │   └── schemas.py       # Pydantic 모델
│   ├── repos/
│   │   └── csv_repo.py      # S3/MinIO 저장소
│   └── main.py              # FastAPI 앱
├── Dockerfile
└── requirements.txt
```

## 🔧 Configuration

### 환경 변수
```env
# MinIO/S3 설정
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=csv-storage
MINIO_SECURE=false
MINIO_REGION=us-east-1

# Presigned URL 설정
PRESIGNED_URL_EXPIRY=3600  # 1 hour

# 상태 자동 초기화
CSV_STATUS_AUTO_CLEAR=true
CSV_STATUS_CLEAR_DELAY=300  # 5 minutes

# JWT 인증
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256

# SSL 검증 (개발용)
VERIFY_SSL=false
```

## 🏗️ Architecture

### 컴포넌트 구조
```
┌─────────────────┐
│   API Gateway   │
└────────┬────────┘
         │ /api/ai/csv/*
         ▼
┌─────────────────┐
│  CSV Manager    │
│   Service       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MinIO/S3       │
│   Storage       │
└─────────────────┘
```

### 파일 처리 흐름
1. **Upload**: 파일 업로드 → 체크섬 계산 → S3 저장 → 메타데이터 기록
2. **Status**: 초기 상태 "ingesting" → 처리 중 상태 변경 → 완료 후 "none"
3. **Replace**: 기존 파일 백업 → 새 파일 업로드 → 메타데이터 업데이트
4. **Delete**: 상태 확인 → S3에서 삭제 → 메타데이터 제거

## 🔒 Security

### 인증 및 권한
- **Admin**: 모든 작업 가능 (업로드, 삭제, 교체)
- **User**: 읽기 전용 (상태 확인)

### 파일 검증
- CSV 확장자 검증
- Content-Type 확인
- SHA-256 체크섬 생성 및 저장

## 🚀 Development

### 로컬 실행
```bash
# 독립 실행
cd csv-manager
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003

# Docker로 실행
docker build -t csv-manager .
docker run -p 8003:8003 csv-manager
```

### MinIO 설정
```bash
# MinIO 서버 시작
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

## 📊 Status Types

| Status | Description | Next Action |
|--------|------------|-------------|
| `ingesting` | 파일 업로드 및 초기 처리 중 | 데이터 검증 |
| `leakage_calculating` | 데이터 누출 계산 중 | 분석 준비 |
| `analyzing` | AI 분석 진행 중 | 결과 생성 |
| `none` | 처리 완료 또는 대기 상태 | - |

## 🔍 Monitoring

### Health Check
```bash
GET /health
# Response: {"status": "healthy", "service": "csv-manager"}
```

### Service Info
```bash
GET /
# Response: Service information and available endpoints
```

## 📝 Notes

- 메타데이터는 현재 메모리에 저장 (프로덕션에서는 DB 사용 권장)
- 파일명은 고유해야 함 (중복 불가)
- 처리 중인 파일은 삭제/교체 불가
- Presigned URL은 1시간 후 만료

## 🤝 Integration

이 서비스는 API Gateway를 통해 접근하며, 다른 마이크로서비스들과 협업합니다:
- **Gateway**: 요청 라우팅 및 인증
- **Classifier**: 업로드된 CSV 분류
- **Analysis**: CSV 데이터 분석