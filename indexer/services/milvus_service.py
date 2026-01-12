# ==============================================================================
# Milvus Service - Vector database operations
# ==============================================================================

from pymilvus import (
    connections,
    Collection,
    CollectionSchema,
    FieldSchema,
    DataType,
    utility
)
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from loguru import logger
import time

from config import get_settings


@dataclass
class SearchResult:
    """A single search result."""
    id: str
    score: float
    file_path: str
    file_name: str
    page_number: int
    total_pages: int
    division: str
    text_content: str
    language: str
    created_at: int
    is_first_page: bool
    is_last_page: bool
    
    # Make the dataclass mutable so we can update scores
    def __post_init__(self):
        pass


class MilvusService:
    """
    Service for interacting with Milvus vector database.
    Handles collection management, indexing, and search operations.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self._collection: Optional[Collection] = None
        self._connected = False
    
    def connect(self) -> bool:
        """Establish connection to Milvus."""
        try:
            connections.connect(
                alias="default",
                host=self.settings.milvus_host,
                port=self.settings.milvus_port
            )
            self._connected = True
            logger.info(
                f"Connected to Milvus at "
                f"{self.settings.milvus_host}:{self.settings.milvus_port}"
            )
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Milvus: {e}")
            return False
    
    def disconnect(self):
        """Close connection to Milvus."""
        if self._connected:
            connections.disconnect("default")
            self._connected = False
            logger.info("Disconnected from Milvus")
    
    def ensure_collection(self) -> Collection:
        """
        Ensure the collection exists, creating it if necessary.
        
        Returns:
            Collection object
        """
        if self._collection is not None:
            return self._collection
        
        collection_name = self.settings.milvus_collection
        
        if utility.has_collection(collection_name):
            self._collection = Collection(collection_name)
            self._collection.load()
            logger.info(f"Loaded existing collection: {collection_name}")
        else:
            self._collection = self._create_collection(collection_name)
            logger.info(f"Created new collection: {collection_name}")
        
        return self._collection
    
    def _create_collection(self, name: str) -> Collection:
        """
        Create a new collection with the required schema.
        
        Args:
            name: Collection name
            
        Returns:
            Created Collection object
        """
        fields = [
            # Primary key
            FieldSchema(
                name="id",
                dtype=DataType.VARCHAR,
                max_length=512,
                is_primary=True,
                auto_id=False
            ),
            
            # Vector field for semantic search
            FieldSchema(
                name="vector",
                dtype=DataType.FLOAT_VECTOR,
                dim=self.settings.embedding_dimension
            ),
            
            # Document metadata
            FieldSchema(
                name="file_path",
                dtype=DataType.VARCHAR,
                max_length=2048
            ),
            FieldSchema(
                name="file_name",
                dtype=DataType.VARCHAR,
                max_length=512
            ),
            FieldSchema(
                name="page_number",
                dtype=DataType.INT64
            ),
            FieldSchema(
                name="total_pages",
                dtype=DataType.INT64
            ),
            FieldSchema(
                name="is_first_page",
                dtype=DataType.BOOL
            ),
            FieldSchema(
                name="is_last_page",
                dtype=DataType.BOOL
            ),
            
            # Security / RBAC
            FieldSchema(
                name="division",
                dtype=DataType.VARCHAR,
                max_length=64
            ),
            FieldSchema(
                name="user_id",
                dtype=DataType.VARCHAR,
                max_length=256
            ),
            
            # Content (for highlighting and display)
            FieldSchema(
                name="text_content",
                dtype=DataType.VARCHAR,
                max_length=65535
            ),
            
            # Additional metadata
            FieldSchema(
                name="language",
                dtype=DataType.VARCHAR,
                max_length=16
            ),
            FieldSchema(
                name="created_at",
                dtype=DataType.INT64
            ),
            FieldSchema(
                name="file_size",
                dtype=DataType.INT64
            ),
            FieldSchema(
                name="content_type",
                dtype=DataType.VARCHAR,
                max_length=128
            ),
        ]
        
        schema = CollectionSchema(
            fields=fields,
            description="CENADI document search collection"
        )
        
        collection = Collection(name=name, schema=schema)
        
        # Create vector index for fast similarity search
        index_params = {
            "metric_type": "COSINE",
            "index_type": "IVF_FLAT",
            "params": {"nlist": 1024}
        }
        collection.create_index(
            field_name="vector",
            index_params=index_params
        )
        
        collection.load()
        
        return collection
    
    def insert_documents(self, documents: List[Dict[str, Any]]) -> int:
        """
        Insert documents into the collection.
        
        Args:
            documents: List of document dictionaries with all required fields
            
        Returns:
            Number of documents inserted
        """
        collection = self.ensure_collection()
        
        try:
            result = collection.insert(documents)
            collection.flush()
            logger.info(f"Inserted {len(result.primary_keys)} documents")
            return len(result.primary_keys)
        except Exception as e:
            logger.error(f"Failed to insert documents: {e}")
            raise
    
    def delete_by_file(self, file_path: str) -> int:
        """
        Delete all pages of a document by file path.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Number of deleted records
        """
        collection = self.ensure_collection()
        
        expr = f'file_path == "{file_path}"'
        
        try:
            result = collection.delete(expr)
            collection.flush()
            logger.info(f"Deleted documents matching: {file_path}")
            return result.delete_count if hasattr(result, 'delete_count') else 0
        except Exception as e:
            logger.error(f"Failed to delete documents: {e}")
            raise
    
    def search(
        self,
        query_vector: List[float],
        division_filter: Optional[str] = None,
        limit: int = 20,
        search_params: Optional[Dict] = None
    ) -> List[SearchResult]:
        """
        Perform vector similarity search.
        
        Args:
            query_vector: Query embedding
            division_filter: Optional division to filter by (RBAC)
            limit: Maximum number of results
            search_params: Optional search parameters
            
        Returns:
            List of SearchResult objects
        """
        collection = self.ensure_collection()
        
        # Build filter expression for RBAC
        expr = None
        if division_filter:
            expr = f'division == "{division_filter}"'
        
        # Default search params
        if search_params is None:
            search_params = {"metric_type": "COSINE", "params": {"nprobe": 10}}
        
        # Fields to return
        output_fields = [
            "file_path", "file_name", "page_number", "total_pages",
            "division", "text_content", "language", "created_at",
            "is_first_page", "is_last_page"
        ]
        
        try:
            results = collection.search(
                data=[query_vector],
                anns_field="vector",
                param=search_params,
                limit=limit,
                expr=expr,
                output_fields=output_fields
            )
            
            search_results = []
            for hits in results:
                for hit in hits:
                    search_results.append(SearchResult(
                        id=hit.id,
                        score=hit.score,
                        file_path=hit.entity.get("file_path"),
                        file_name=hit.entity.get("file_name"),
                        page_number=hit.entity.get("page_number"),
                        total_pages=hit.entity.get("total_pages"),
                        division=hit.entity.get("division"),
                        text_content=hit.entity.get("text_content"),
                        language=hit.entity.get("language"),
                        created_at=hit.entity.get("created_at"),
                        is_first_page=hit.entity.get("is_first_page"),
                        is_last_page=hit.entity.get("is_last_page")
                    ))
            
            return search_results
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            raise
    
    def keyword_search(
        self,
        query: str,
        division_filter: Optional[str] = None,
        limit: int = 20
    ) -> List[SearchResult]:
        """
        Perform keyword-based search using text matching.
        
        Note: Milvus 2.4+ supports full-text search with BM25.
        This is a simplified implementation using expression filters.
        
        Args:
            query: Search query string
            division_filter: Optional division filter
            limit: Maximum results
            
        Returns:
            List of SearchResult objects
        """
        collection = self.ensure_collection()
        
        # Escape query for safety - keep original case for matching
        safe_query = query.replace('"', '\\"').replace("'", "\\'")
        
        exprs = []
        
        # Try both original case and lowercase for better matching
        # Milvus LIKE is case-sensitive, so we search for common patterns
        if division_filter:
            exprs.append(f'division == "{division_filter}"')
        
        expr = " and ".join(exprs) if exprs else None
        
        output_fields = [
            "file_path", "file_name", "page_number", "total_pages",
            "division", "text_content", "language", "created_at",
            "is_first_page", "is_last_page"
        ]
        
        try:
            # First, try to get documents and filter in Python for case-insensitive matching
            # This is more reliable than Milvus LIKE for case-insensitive search
            if expr:
                results = collection.query(
                    expr=expr,
                    output_fields=output_fields,
                    limit=limit * 10  # Get more to filter
                )
            else:
                # No division filter - get all and filter
                results = collection.query(
                    expr="page_number >= 1",  # Get all documents
                    output_fields=output_fields,
                    limit=limit * 10
                )
            
            # Case-insensitive filtering in Python
            query_lower = query.lower()
            query_terms = query_lower.split()
            
            search_results = []
            for item in results:
                text_content = item.get("text_content", "") or ""
                text_lower = text_content.lower()
                
                # Check if any query term is in the text
                if any(term in text_lower for term in query_terms):
                    search_results.append(SearchResult(
                        id=item.get("id", ""),
                        score=1.0,  # Keyword matches are binary
                        file_path=item.get("file_path"),
                        file_name=item.get("file_name"),
                        page_number=item.get("page_number"),
                        total_pages=item.get("total_pages"),
                        division=item.get("division"),
                        text_content=text_content,
                        language=item.get("language"),
                        created_at=item.get("created_at"),
                        is_first_page=item.get("is_first_page", False),
                        is_last_page=item.get("is_last_page", False)
                    ))
                    
                    if len(search_results) >= limit:
                        break
            
            logger.info(f"Keyword search for '{query}' found {len(search_results)} results")
            return search_results
            
        except Exception as e:
            logger.error(f"Keyword search failed: {e}")
            raise
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the collection."""
        collection = self.ensure_collection()
        
        return {
            "name": collection.name,
            "num_entities": collection.num_entities,
            "schema": str(collection.schema)
        }


# Global instance
milvus_service = MilvusService()
