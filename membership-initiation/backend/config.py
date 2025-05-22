"""
Configuration Settings for MIS API
"""
import os
from pydantic import SecretStr
from typing import Optional

class Settings:
    """Configuration settings for the MIS API"""
    
    # API Configuration
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "3000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    
    # Security
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "changeme_in_production")
    ALLOWED_ORIGINS: list = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "your-supabase-key")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "your-supabase-service-key")
    
    # Email Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.example.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "user@example.com")
    SMTP_PASS: str = os.getenv("SMTP_PASS", "password")
    
    # Site Configuration
    SITE_URL: str = os.getenv("SITE_URL", "http://localhost:3000")
    
    # Authentication
    OPERATOR_TOKEN: str = os.getenv("OPERATOR_TOKEN", "")
    
    # Rate limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE", "100"))
    RATE_LIMIT_BURST: int = int(os.getenv("RATE_LIMIT_BURST", "20"))
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
    
    # WebSocket settings
    WS_MAX_CONNECTIONS: int = int(os.getenv("WS_MAX_CONNECTIONS", "1000"))
    WS_PING_INTERVAL: int = int(os.getenv("WS_PING_INTERVAL", "30"))
    
    # Cache settings
    CACHE_TTL: int = int(os.getenv("CACHE_TTL", "300"))
    CACHE_MAX_ITEMS: int = int(os.getenv("CACHE_MAX_ITEMS", "1000"))
    
    # HTTP Client settings
    HTTP_POOL_MAX_SIZE: int = int(os.getenv("HTTP_POOL_MAX_SIZE", "100"))
    HTTP_KEEPALIVE_EXPIRY: int = int(os.getenv("HTTP_KEEPALIVE_EXPIRY", "300"))
    HTTP_TIMEOUT: float = float(os.getenv("HTTP_TIMEOUT", "10.0"))
    
    # Control Center integration
    CONTROL_CENTER_API_URL: str = os.getenv("CONTROL_CENTER_API_URL", "http://localhost:3001/api")
    CONTROL_CENTER_API_KEY: str = os.getenv("CONTROL_CENTER_API_KEY", "")
    CONTROL_CENTER_INTEGRATION: bool = os.getenv("CONTROL_CENTER_INTEGRATION", "True").lower() in ("true", "1", "t")

# Create settings instance
settings = Settings()