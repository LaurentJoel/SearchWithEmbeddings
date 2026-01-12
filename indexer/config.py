# ==============================================================================
# Configuration Management
# ==============================================================================

import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Milvus Configuration
    milvus_host: str = "localhost"
    milvus_port: int = 19530
    milvus_collection: str = "cenadi_documents"
    
    # Embedding Configuration
    embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"
    embedding_dimension: int = 384
    
    # OCR Configuration
    tesseract_languages: str = "fra+eng"
    ocr_dpi: int = 300
    
    # Document Processing
    documents_path: str = "/documents"
    max_file_size_mb: int = 100
    supported_extensions: list = [
        ".pdf",           # PDF documents
        ".png", ".jpg", ".jpeg", ".tiff", ".tif",  # Images (OCR)
        ".txt",           # Plain text
        ".doc", ".docx",  # Word documents
        ".xls", ".xlsx",  # Excel spreadsheets
    ]
    
    # Chunking Configuration
    chunk_by_page: bool = True  # Index each page separately
    
    # Search Configuration
    search_limit: int = 20
    hybrid_search_weight: float = 0.6  # Weight for semantic vs keyword (0.6 = 60% semantic)
    
    # Logging
    log_level: str = "info"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
