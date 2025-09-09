from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Service"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["*"]
    
    # Database
    DATABASE_URL: Optional[str] = None
    
    # Redis
    REDIS_HOST: Optional[str] = None
    REDIS_PORT: int = 6379
    
    # ML Model paths
    MODEL_PATH: str = "./models"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()