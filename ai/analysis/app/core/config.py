from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "Financial Analysis Service"
    VERSION: str = "1.0.0"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8002
    
    # OpenAI GPT Configuration
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    
    # Analysis Settings
    MAX_DATA_POINTS: int = 10000
    CONFIDENCE_THRESHOLD: float = 0.8
    ANOMALY_THRESHOLD: float = 0.95
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()