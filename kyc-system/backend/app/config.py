from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./kyc.db"
    JWT_SECRET: str = "change-this-super-secret-key"
    JWT_TTL_HOURS: int = 12

settings = Settings()
