# ==============================================================================
# Embedding Service - Multilingual Sentence Transformers
# ==============================================================================

from sentence_transformers import SentenceTransformer
from loguru import logger
from typing import List, Union
import numpy as np

from config import get_settings


class EmbeddingService:
    """
    Service for generating text embeddings using multilingual sentence transformers.
    Uses paraphrase-multilingual-MiniLM-L12-v2 for French/English support.
    """
    
    _instance = None
    _model = None
    
    def __new__(cls):
        """Singleton pattern to avoid loading model multiple times."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._model is None:
            self._load_model()
    
    def _load_model(self):
        """Load the embedding model."""
        settings = get_settings()
        logger.info(f"Loading embedding model: {settings.embedding_model}")
        
        try:
            self._model = SentenceTransformer(settings.embedding_model)
            # Verify dimension matches configuration
            test_embedding = self._model.encode("test")
            actual_dim = len(test_embedding)
            
            if actual_dim != settings.embedding_dimension:
                logger.warning(
                    f"Embedding dimension mismatch: expected {settings.embedding_dimension}, "
                    f"got {actual_dim}. Updating configuration."
                )
            
            logger.info(
                f"Model loaded successfully. Dimension: {actual_dim}"
            )
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
    
    def encode(self, text: Union[str, List[str]], normalize: bool = True) -> np.ndarray:
        """
        Generate embeddings for text(s).
        
        Args:
            text: Single text string or list of texts
            normalize: Whether to L2-normalize the embeddings (recommended for similarity search)
            
        Returns:
            Numpy array of embeddings. Shape: (dim,) for single text, (n, dim) for list
        """
        if isinstance(text, str):
            text = [text]
        
        # Clean empty strings
        text = [t.strip() if t else "" for t in text]
        
        embeddings = self._model.encode(
            text,
            normalize_embeddings=normalize,
            show_progress_bar=False
        )
        
        return embeddings
    
    def encode_single(self, text: str, normalize: bool = True) -> List[float]:
        """
        Generate embedding for a single text and return as list.
        
        Args:
            text: Text to encode
            normalize: Whether to L2-normalize
            
        Returns:
            List of floats representing the embedding
        """
        embedding = self.encode(text, normalize=normalize)
        if len(embedding.shape) > 1:
            embedding = embedding[0]
        return embedding.tolist()
    
    def similarity(self, text1: str, text2: str) -> float:
        """
        Calculate cosine similarity between two texts.
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Similarity score between 0 and 1
        """
        emb1 = self.encode(text1, normalize=True)
        emb2 = self.encode(text2, normalize=True)
        
        if len(emb1.shape) > 1:
            emb1 = emb1[0]
        if len(emb2.shape) > 1:
            emb2 = emb2[0]
        
        return float(np.dot(emb1, emb2))
    
    @property
    def dimension(self) -> int:
        """Get the embedding dimension."""
        return self._model.get_sentence_embedding_dimension()


# Global instance
embedding_service = EmbeddingService()
