# ==============================================================================
# FastAPI Main Application - Document Indexing Service
# ==============================================================================

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from pathlib import Path
from loguru import logger
import time
import os
import hashlib
from contextlib import asynccontextmanager

from config import get_settings
from services import (
    embedding_service,
    pdf_processor,
    milvus_service,
    FileWatcher
)


# ==============================================================================
# Lifespan Management
# ==============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    settings = get_settings()
    
    # Startup
    logger.info("Starting Document Indexer Service...")
    
    # Connect to Milvus
    if not milvus_service.connect():
        logger.error("Failed to connect to Milvus")
    else:
        milvus_service.ensure_collection()
    
    # Initialize file watcher
    app.state.file_watcher = FileWatcher(on_file_ready=index_single_file)
    
    # Start watching if auto-watch is enabled
    if os.path.exists(settings.documents_path):
        app.state.file_watcher.start(settings.documents_path)
    
    logger.info("Document Indexer Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Document Indexer Service...")
    if hasattr(app.state, 'file_watcher'):
        app.state.file_watcher.stop()
    milvus_service.disconnect()
    logger.info("Shutdown complete")


# ==============================================================================
# FastAPI Application
# ==============================================================================

app = FastAPI(
    title="CENADI Document Indexer",
    description="Document indexing service with OCR, embeddings, and vector search",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# Request/Response Models
# ==============================================================================

class SearchRequest(BaseModel):
    query: str
    mode: str = "hybrid"  # "semantic", "keyword", or "hybrid"
    search_mode: Optional[str] = None  # Alias for mode (frontend compatibility)
    division: Optional[str] = None
    limit: int = 20
    
    def get_mode(self) -> str:
        """Get the search mode, preferring search_mode if provided."""
        return self.search_mode or self.mode


class SearchResultItem(BaseModel):
    id: str
    score: float
    file_path: str
    file_name: str
    page_number: int
    total_pages: int
    division: str
    text_snippet: str
    language: str
    is_first_page: bool
    is_last_page: bool


class SearchResponse(BaseModel):
    query: str
    mode: str
    total_results: int
    results: List[SearchResultItem]
    search_time_ms: float


class IndexRequest(BaseModel):
    file_path: str
    division: Optional[str] = None
    user_id: Optional[str] = None


class IndexResponse(BaseModel):
    success: bool
    file_path: str
    pages_indexed: int
    message: str


class StatusResponse(BaseModel):
    status: str
    milvus_connected: bool
    collection_stats: Dict[str, Any]
    file_watcher_active: bool


# ==============================================================================
# Helper Functions
# ==============================================================================

def generate_page_id(file_path: str, page_number: int) -> str:
    """Generate unique ID for a page."""
    content = f"{file_path}:{page_number}"
    return hashlib.sha256(content.encode()).hexdigest()[:32]


def extract_division_from_path(file_path: str) -> str:
    """Extract division code from file path (e.g., /documents/DEL/file.pdf -> DEL)."""
    parts = Path(file_path).parts
    
    # Known division codes
    known_divisions = {
        "DG",      # Direction Générale
        "DEL",     # Direction des Études et de la Législation
        "DRH",     # Direction des Ressources Humaines
        "DAF",     # Direction Administrative et Financière
        "DSI",     # Direction des Systèmes d'Information
        "DCOM",    # Direction de la Communication
        "DAJ",     # Direction des Affaires Juridiques
        "DCOOP",   # Direction de la Coopération
        "CENADI", 
        "UPLOADS", # Generic uploads
    }
    
    for part in parts:
        if part.upper() in known_divisions:
            return part.upper()
    
    return "GENERAL"


def get_text_snippet(text: str, max_length: int = 300) -> str:
    """Get a snippet of text for preview."""
    if len(text) <= max_length:
        return text
    return text[:max_length].rsplit(' ', 1)[0] + "..."


def index_single_file(file_path: str, division: str = None, user_id: str = None) -> int:
    """
    Index a single file into Milvus.
    
    Returns:
        Number of pages indexed
    """
    settings = get_settings()
    
    # Process PDF
    doc_content = pdf_processor.process_pdf(file_path)
    if not doc_content:
        logger.error(f"Failed to process: {file_path}")
        return 0
    
    # Extract division from path if not provided
    if not division:
        division = extract_division_from_path(file_path)
    
    # Prepare documents for insertion
    documents = []
    current_time = int(time.time())
    
    for page in doc_content.pages:
        if not page.text or len(page.text.strip()) < 10:
            continue
        
        # Generate embedding
        embedding = embedding_service.encode_single(page.text)
        
        # Create document record
        doc = {
            "id": generate_page_id(file_path, page.page_number),
            "vector": embedding,
            "file_path": doc_content.file_path,
            "file_name": doc_content.file_name,
            "page_number": page.page_number,
            "total_pages": doc_content.total_pages,
            "is_first_page": page.page_number == 1,
            "is_last_page": page.page_number == doc_content.total_pages,
            "division": division,
            "user_id": user_id or "",
            "text_content": page.text[:65000],  # Milvus VARCHAR limit
            "language": page.language or "unknown",
            "created_at": current_time,
            "file_size": doc_content.file_size,
            "content_type": "application/pdf"
        }
        documents.append(doc)
    
    # Insert into Milvus
    if documents:
        # Delete existing pages for this file first (re-indexing)
        milvus_service.delete_by_file(file_path)
        
        # Insert new pages
        milvus_service.insert_documents(documents)
        logger.info(f"Indexed {len(documents)} pages from {doc_content.file_name}")
    
    return len(documents)


# ==============================================================================
# API Endpoints
# ==============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "document-indexer"}


@app.get("/status", response_model=StatusResponse)
async def get_status():
    """Get service status and statistics."""
    try:
        stats = milvus_service.get_collection_stats()
        milvus_ok = True
    except Exception:
        stats = {}
        milvus_ok = False
    
    return StatusResponse(
        status="running",
        milvus_connected=milvus_ok,
        collection_stats=stats,
        file_watcher_active=app.state.file_watcher.is_watching if hasattr(app.state, 'file_watcher') else False
    )


# ==============================================================================
# Common French-English Translation Pairs for Cross-Language Search
# ==============================================================================
TRANSLATION_PAIRS = {
    # Finance/Legal terms
    "loi": ["law", "act", "legislation"],
    "finances": ["finance", "financial", "budget", "fiscal"],
    "budget": ["budget", "budgetary"],
    "décret": ["decree", "order", "regulation"],
    "arrêté": ["order", "decree", "ruling"],
    "contrat": ["contract", "agreement"],
    "accord": ["agreement", "accord", "treaty"],
    "prêt": ["loan", "lending"],
    "emprunt": ["loan", "borrowing"],
    "rapport": ["report", "statement"],
    "procédure": ["procedure", "process"],
    "règlement": ["regulation", "settlement", "rule"],
    "impôt": ["tax", "taxation"],
    "taxe": ["tax", "fee", "duty"],
    "trésor": ["treasury", "treasure"],
    "dette": ["debt", "liability"],
    "créance": ["receivable", "claim", "debt"],
    "dépense": ["expense", "expenditure", "spending"],
    "recette": ["revenue", "income", "receipt"],
    "exercice": ["fiscal year", "exercise", "financial year"],
    "bilan": ["balance sheet", "assessment", "review"],
    "comptabilité": ["accounting", "bookkeeping"],
    "audit": ["audit", "review"],
    "ministère": ["ministry", "department"],
    "gouvernement": ["government", "administration"],
    "république": ["republic"],
    "cameroun": ["cameroon"],
    # Administrative terms
    "document": ["document", "file", "record"],
    "dossier": ["file", "folder", "case"],
    "administration": ["administration", "management"],
    "direction": ["directorate", "department", "direction"],
    "service": ["service", "department"],
    # English to French (reverse lookup)
    "law": ["loi", "droit", "législation"],
    "finance": ["finances", "financier", "budget"],
    "budget": ["budget", "budgétaire"],
    "decree": ["décret", "arrêté"],
    "loan": ["prêt", "emprunt"],
    "agreement": ["accord", "contrat", "convention"],
    "report": ["rapport", "compte-rendu"],
    "tax": ["impôt", "taxe", "fiscal"],
    "treasury": ["trésor", "trésorerie"],
    "ministry": ["ministère"],
    "government": ["gouvernement"],
}


def get_translated_terms(query_terms: list) -> set:
    """Get translated equivalents for query terms."""
    translated = set()
    for term in query_terms:
        term_lower = term.lower()
        # Direct translations
        if term_lower in TRANSLATION_PAIRS:
            translated.update(TRANSLATION_PAIRS[term_lower])
        # Also add the original term
        translated.add(term_lower)
    return translated


@app.post("/search", response_model=SearchResponse)
async def search_documents(request: SearchRequest):
    """
    Search for documents using semantic, keyword, or hybrid search.
    Supports cross-language matching (French/English).
    """
    start_time = time.time()
    
    results = []
    query_lower = request.query.lower().strip()
    query_terms = query_lower.split()
    
    # Get translated terms for cross-language matching
    all_search_terms = get_translated_terms(query_terms)
    
    # Get the actual search mode (supports both 'mode' and 'search_mode' fields)
    search_mode = request.get_mode()
    
    def calculate_phrase_boost(text: str, query: str, terms: list, translated_terms: set) -> float:
        """
        Calculate a boost score based on phrase matching.
        Supports cross-language matching with translations.
        - Exact phrase match: +0.3
        - All original terms present: +0.2
        - Translated terms match: +0.15
        - Partial term matches: proportional boost
        """
        text_lower = text.lower()
        boost = 0.0
        
        # Check for exact phrase match (highest boost)
        if query in text_lower:
            boost += 0.3
        
        # Check how many original terms are present
        if terms:
            matched_terms = sum(1 for term in terms if term in text_lower)
            term_ratio = matched_terms / len(terms)
            
            if term_ratio == 1.0:
                # All original terms present
                boost += 0.2
            elif term_ratio > 0:
                # Partial match of original terms
                boost += term_ratio * 0.1
        
        # Check for translated term matches (cross-language support)
        if translated_terms and boost < 0.2:  # Only if no strong original match
            matched_translated = sum(1 for term in translated_terms if term in text_lower)
            if matched_translated > 0:
                trans_ratio = matched_translated / len(translated_terms)
                # Boost for translated term matches
                boost += min(0.15, trans_ratio * 0.15)
        
        return boost
    
    if search_mode == "semantic":
        # Semantic search with phrase boosting
        query_embedding = embedding_service.encode_single(request.query)
        
        semantic_results = milvus_service.search(
            query_vector=query_embedding,
            division_filter=request.division,
            limit=request.limit * 2  # Get more to filter
        )
        
        # Filter and boost based on phrase matching (including cross-language)
        MIN_SEMANTIC_SCORE = 0.30  # Lower threshold to allow cross-language matches
        for r in semantic_results:
            if r.score >= MIN_SEMANTIC_SCORE:
                text_content = r.text_content or ""
                phrase_boost = calculate_phrase_boost(text_content, query_lower, query_terms, all_search_terms)
                r.score = min(1.0, r.score + phrase_boost)  # Cap at 1.0
                results.append(r)
    
    elif search_mode == "keyword":
        # Pure keyword search - only return documents containing the search terms
        keyword_results = milvus_service.keyword_search(
            query=request.query,
            division_filter=request.division,
            limit=request.limit
        )
        
        # Boost results with exact phrase matches (including translations)
        for kr in keyword_results:
            text_content = kr.text_content or ""
            phrase_boost = calculate_phrase_boost(text_content, query_lower, query_terms, all_search_terms)
            kr.score = min(1.0, kr.score + phrase_boost)
        
        results = keyword_results
    
    else:  # hybrid (default)
        # Hybrid mode: Combine semantic similarity with phrase matching
        
        # Get semantic results first
        query_embedding = embedding_service.encode_single(request.query)
        semantic_results = milvus_service.search(
            query_vector=query_embedding,
            division_filter=request.division,
            limit=request.limit * 3  # Get more for comprehensive matching
        )
        
        # Get keyword matches
        keyword_results = milvus_service.keyword_search(
            query=request.query,
            division_filter=request.division,
            limit=request.limit * 2
        )
        
        # Create maps for merging
        semantic_scores = {r.id: r for r in semantic_results}
        keyword_ids = {r.id for r in keyword_results}
        
        # Process all semantic results with boosting (cross-language aware)
        for sr in semantic_results:
            text_content = sr.text_content or ""
            phrase_boost = calculate_phrase_boost(text_content, query_lower, query_terms, all_search_terms)
            
            # Base semantic score
            base_score = sr.score
            
            # Boost if also found in keyword search
            if sr.id in keyword_ids:
                base_score += 0.2
            
            # Add phrase boost
            sr.score = min(1.0, base_score + phrase_boost)
            
            # Only include if score is above threshold or has phrase match
            if sr.score >= 0.4 or phrase_boost > 0:
                results.append(sr)
        
        # Add keyword results not in semantic results
        existing_ids = {r.id for r in results}
        for kr in keyword_results:
            if kr.id not in existing_ids:
                text_content = kr.text_content or ""
                phrase_boost = calculate_phrase_boost(text_content, query_lower, query_terms, all_search_terms)
                kr.score = min(1.0, 0.5 + phrase_boost)  # Base score for keyword match
                results.append(kr)
    
    # Sort by score (descending)
    results.sort(key=lambda x: x.score, reverse=True)
    
    # Limit results
    results = results[:request.limit]
    
    # Convert to response format
    response_results = [
        SearchResultItem(
            id=r.id,
            score=r.score,
            file_path=r.file_path,
            file_name=r.file_name,
            page_number=r.page_number,
            total_pages=r.total_pages,
            division=r.division,
            text_snippet=get_text_snippet(r.text_content),
            language=r.language,
            is_first_page=r.is_first_page,
            is_last_page=r.is_last_page
        )
        for r in results
    ]
    
    search_time = (time.time() - start_time) * 1000
    
    return SearchResponse(
        query=request.query,
        mode=search_mode,
        total_results=len(response_results),
        results=response_results,
        search_time_ms=round(search_time, 2)
    )


@app.post("/index/file", response_model=IndexResponse)
async def index_file(request: IndexRequest, background_tasks: BackgroundTasks):
    """Index a single file."""
    file_path = request.file_path
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
    
    if not file_path.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Index the file
    pages_indexed = index_single_file(
        file_path=file_path,
        division=request.division,
        user_id=request.user_id
    )
    
    return IndexResponse(
        success=pages_indexed > 0,
        file_path=file_path,
        pages_indexed=pages_indexed,
        message=f"Indexed {pages_indexed} pages" if pages_indexed > 0 else "Failed to index file"
    )


@app.post("/index/directory")
async def index_directory(
    path: Optional[str] = None,
    background_tasks: BackgroundTasks = None
):
    """
    Trigger indexing of all documents in a directory.
    Runs in background.
    """
    settings = get_settings()
    scan_path = path or settings.documents_path
    
    if not os.path.exists(scan_path):
        raise HTTPException(status_code=404, detail=f"Directory not found: {scan_path}")
    
    # Count files
    pdf_files = list(Path(scan_path).rglob("*.pdf"))
    
    # Start background indexing
    def background_index():
        for pdf_path in pdf_files:
            try:
                index_single_file(str(pdf_path))
            except Exception as e:
                logger.error(f"Failed to index {pdf_path}: {e}")
    
    background_tasks.add_task(background_index)
    
    return {
        "status": "indexing_started",
        "directory": scan_path,
        "files_found": len(pdf_files)
    }


@app.delete("/index/file")
async def remove_file_from_index(file_path: str):
    """Remove a file from the index."""
    try:
        deleted = milvus_service.delete_by_file(file_path)
        return {"success": True, "file_path": file_path, "deleted_records": deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/document/{doc_id}/pages")
async def get_document_pages(doc_id: str):
    """Get all indexed pages for a document."""
    # This would query Milvus for all pages of a document
    # Implementation depends on your document ID scheme
    pass


# ==============================================================================
# Run with: uvicorn main:app --host 0.0.0.0 --port 8000
# ==============================================================================
