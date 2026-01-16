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
    embedding_batch_size: int = 32  # Batch size for embedding generation
    
    # OCR Configuration
    tesseract_languages: str = "fra+eng"
    ocr_dpi: int = 200  # Reduced from 300 for faster processing
    ocr_timeout: int = 120  # Timeout per page in seconds
    
    # Document Processing
    documents_path: str = "/documents"
    max_file_size_mb: int = 100
    max_pages_per_document: int = 500  # Limit for very large PDFs
    supported_extensions: list = [
        ".pdf",           # PDF documents
        ".png", ".jpg", ".jpeg", ".tiff", ".tif",  # Images (OCR)
        ".txt",           # Plain text
        ".doc", ".docx",  # Word documents
        ".xls", ".xlsx",  # Excel spreadsheets
    ]
    
    # Chunking Configuration
    chunk_by_page: bool = True  # Index each page separately
    max_chunk_size: int = 1000  # Max characters per chunk
    
    # Search Configuration
    search_limit: int = 20
    search_timeout: int = 30  # Search timeout in seconds
    hybrid_search_weight: float = 0.6  # Weight for semantic vs keyword (0.6 = 60% semantic)
    
    # Performance
    workers: int = 2  # Number of uvicorn workers
    max_concurrent_indexing: int = 3  # Max concurrent file processing
    
    # Caching
    enable_embedding_cache: bool = True
    cache_ttl_hours: int = 24
    
    # Logging
    log_level: str = "info"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
