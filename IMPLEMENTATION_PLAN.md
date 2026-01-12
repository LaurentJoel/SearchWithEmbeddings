# SearchWithEmbeddings - Complete Implementation Plan

## Project Overview

A document search system using Milvus vector database with hybrid search capabilities (semantic + keyword), OCR processing, multilingual support (French/English), and role-based access control.

---

## Project Structure

```
SearchWithEmbeddings/
├── docker-compose.yml              # All services orchestration
├── .env                            # Environment variables
├── .env.example                    # Example environment file
├── README.md                       # Project documentation
│
├── app/                            # Next.js 14 Application
│   ├── package.json
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma           # User/Auth database schema
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx            # Landing/Search page
│   │   │   ├── globals.css
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── signup/page.tsx
│   │   │   ├── search/
│   │   │   │   └── page.tsx        # Search results page
│   │   │   ├── document/
│   │   │   │   └── [id]/page.tsx   # Document viewer
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx        # Admin dashboard
│   │   │   │   ├── users/page.tsx
│   │   │   │   └── indexing/page.tsx
│   │   │   └── api/
│   │   │       ├── auth/[...nextauth]/route.ts
│   │   │       ├── search/route.ts
│   │   │       ├── document/[id]/route.ts
│   │   │       ├── pdf/[...path]/route.ts
│   │   │       ├── indexing/
│   │   │       │   ├── status/route.ts
│   │   │       │   └── trigger/route.ts
│   │   │       └── admin/
│   │   │           ├── users/route.ts
│   │   │           └── stats/route.ts
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Footer.tsx
│   │   │   ├── search/
│   │   │   │   ├── SearchBox.tsx
│   │   │   │   ├── SearchFilters.tsx
│   │   │   │   ├── ResultCard.tsx
│   │   │   │   ├── ResultsList.tsx
│   │   │   │   └── SearchModeToggle.tsx
│   │   │   ├── document/
│   │   │   │   ├── DocumentViewer.tsx
│   │   │   │   ├── PageNavigator.tsx
│   │   │   │   ├── PageThumbnails.tsx
│   │   │   │   └── TextHighlighter.tsx
│   │   │   ├── ui/                 # Custom UI components (NOT shadcn generic)
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Tooltip.tsx
│   │   │   │   └── LoadingSpinner.tsx
│   │   │   └── common/
│   │   │       ├── ThemeToggle.tsx
│   │   │       └── LanguageSwitch.tsx
│   │   ├── lib/
│   │   │   ├── milvus.ts           # Milvus client
│   │   │   ├── prisma.ts           # Prisma client
│   │   │   ├── auth.ts             # NextAuth config
│   │   │   ├── rbac.ts             # Role-based access control
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   │   ├── useSearch.ts
│   │   │   ├── useDocument.ts
│   │   │   └── useDebounce.ts
│   │   └── types/
│   │       ├── search.ts
│   │       ├── document.ts
│   │       └── user.ts
│   └── public/
│       ├── logo.svg
│       └── fonts/
│
├── indexer/                        # Python Indexing Service
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                     # FastAPI application
│   ├── config.py                   # Configuration
│   ├── models/
│   │   ├── __init__.py
│   │   ├── document.py             # Document models
│   │   └── embedding.py            # Embedding wrapper
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ocr_service.py          # Tesseract OCR
│   │   ├── pdf_processor.py        # PDF text extraction
│   │   ├── embedding_service.py    # Sentence transformers
│   │   ├── milvus_service.py       # Milvus operations
│   │   └── file_watcher.py         # Directory monitoring
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── text_cleaner.py
│   │   └── language_detector.py
│   └── tests/
│       ├── test_ocr.py
│       ├── test_embedding.py
│       └── test_milvus.py
│
├── nginx/                          # Reverse Proxy (optional)
│   ├── nginx.conf
│   └── Dockerfile
│
└── scripts/
    ├── init-milvus.py              # Initialize Milvus collection
    ├── reindex-all.py              # Bulk reindexing script
    └── backup.sh                   # Backup script
```

---

## Implementation Phases

### Phase 1: Infrastructure Setup (Day 1-2)

#### 1.1 Docker Compose Configuration

Create the complete Docker infrastructure with:
- Milvus standalone (vector database)
- Etcd (Milvus metadata store)
- MinIO (Milvus object storage)
- PostgreSQL (user authentication)
- Python Indexer service
- Next.js application

#### 1.2 Environment Configuration

Set up all necessary environment variables:
- Database connections
- Milvus connection
- Upload directories
- Authentication secrets
- Division/RBAC configuration

#### 1.3 Milvus Collection Schema

Create the collection with fields:
- id (VARCHAR, primary key)
- vector (FLOAT_VECTOR, dim=384)
- file_path (VARCHAR)
- file_name (VARCHAR)
- page_number (INT64)
- total_pages (INT64)
- division (VARCHAR) - for RBAC
- text_content (VARCHAR)
- created_at (INT64)
- file_size (INT64)
- content_type (VARCHAR)
- language (VARCHAR)

---

### Phase 2: Python Indexing Service (Day 3-5)

#### 2.1 Core Services

| Service | Responsibility |
|---------|----------------|
| `ocr_service.py` | Extract text from scanned PDFs using Tesseract |
| `pdf_processor.py` | Extract text from digital PDFs using PyMuPDF |
| `embedding_service.py` | Generate embeddings using paraphrase-multilingual-MiniLM-L12-v2 |
| `milvus_service.py` | Insert/search/delete vectors in Milvus |
| `file_watcher.py` | Monitor directories for new/modified files |

#### 2.2 FastAPI Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/index/file` | POST | Index a single file |
| `/index/directory` | POST | Index all files in directory |
| `/index/status` | GET | Get indexing status |
| `/search` | POST | Perform hybrid search |
| `/document/{id}` | GET | Get document metadata |
| `/document/{id}` | DELETE | Remove document from index |

#### 2.3 OCR Pipeline

1. Detect if PDF is scanned or digital
2. If scanned: Use Tesseract with French+English language packs
3. If digital: Extract text directly with PyMuPDF
4. Process page by page
5. Clean and normalize text
6. Detect language per page
7. Generate embedding for each page
8. Store in Milvus with metadata

---

### Phase 3: Next.js Application (Day 6-10)

#### 3.1 Authentication System

- NextAuth.js with credentials provider
- PostgreSQL user storage via Prisma
- Role-based access: ADMIN, DIRECTOR, DIVISION_HEAD, USER
- Division assignment for RBAC

#### 3.2 Search Interface (Original UI Design)

The UI will follow a **document-centric design language** inspired by professional archiving systems, NOT the typical AI-generated card-based layouts.

**Design Principles:**
- Warm color palette (cream, navy, burgundy accents)
- Typography-focused (clear hierarchy, readable fonts)
- Dense information display (professional, not "airy")
- Subtle animations (no flashy transitions)
- Paper/document textures and metaphors

**Key UI Components:**

| Component | Design Approach |
|-----------|-----------------|
| Search Box | Prominent, centered, with mode indicator (semantic/keyword) |
| Results | Table-style with expandable rows, NOT cards |
| Filters | Collapsible sidebar, faceted navigation |
| Document Viewer | Split view: thumbnails left, document right |
| Page Indicators | Timeline-style visualization showing matches |

#### 3.3 Search Features

| Feature | Implementation |
|---------|----------------|
| Hybrid Search | Combine BM25 keyword + vector similarity |
| Search Mode Toggle | Let users choose: "Exact Match" or "Find Similar" |
| Filters | Date range, file type, division, language |
| Highlighting | Server returns matching text spans |
| Pagination | Cursor-based for performance |
| Recent Searches | Local storage + server-side for logged users |

#### 3.4 Document Viewer Features

| Feature | Implementation |
|---------|----------------|
| Page-level Results | Show exact pages containing matches |
| First/Last Page | Always include for context |
| Text Highlighting | Yellow highlight on matching terms |
| Zoom Controls | Smooth zoom with keyboard shortcuts |
| Page Thumbnails | Left sidebar with match indicators |
| Download | Original file download |

#### 3.5 RBAC Implementation

```typescript
// Access control logic
function canAccessDocument(user: User, document: Document): boolean {
  // Directors see everything
  if (user.role === 'CENADI_DIRECTOR') return true;
  
  // Division heads see their division
  if (user.role === 'DIVISION_HEAD') {
    return document.division === user.division;
  }
  
  // Regular users see their division
  return document.division === user.division;
}
```

---

### Phase 4: Integration & Testing (Day 11-12)

#### 4.1 API Integration

- Connect Next.js to Python indexer API
- Implement retry logic and error handling
- Add request caching where appropriate

#### 4.2 Search Flow Testing

| Test Case | Expected Result |
|-----------|-----------------|
| French query, French doc | High relevance match |
| French query, English doc | Cross-lingual match |
| Keyword search | Exact term matching |
| Semantic search | Meaning-based matching |
| RBAC filtering | Only authorized docs returned |
| Page-level results | Correct pages identified |

#### 4.3 Performance Testing

- Large document indexing (100+ pages)
- Concurrent search requests
- Memory usage under load

---

### Phase 5: Deployment (Day 13-14)

#### 5.1 Production Docker Compose

- Resource limits for each container
- Health checks
- Restart policies
- Volume persistence
- Logging configuration

#### 5.2 Backup Strategy

- Milvus collection backup
- PostgreSQL database backup
- Document files backup

#### 5.3 Monitoring

- Container health monitoring
- Search latency tracking
- Indexing error alerts

---

## UI Design Specifications

### Color Palette

```css
:root {
  /* Primary - Navy (trust, professionalism) */
  --primary-900: #1a2744;
  --primary-800: #243352;
  --primary-700: #2e4060;
  --primary-600: #3d5278;
  
  /* Secondary - Warm Cream (paper, documents) */
  --secondary-100: #faf8f5;
  --secondary-200: #f5f0e8;
  --secondary-300: #ebe4d8;
  
  /* Accent - Burgundy (highlights, actions) */
  --accent-500: #8b3a3a;
  --accent-600: #722f2f;
  --accent-400: #a54848;
  
  /* Semantic */
  --success: #2d5a3d;
  --warning: #8b6914;
  --error: #8b2929;
  
  /* Neutrals */
  --text-primary: #2c2c2c;
  --text-secondary: #5a5a5a;
  --text-muted: #8a8a8a;
  --border: #d4d0c8;
}
```

### Typography

```css
/* Headings - Serif for elegance */
--font-heading: 'Merriweather', 'Georgia', serif;

/* Body - Clean sans-serif for readability */
--font-body: 'Inter', 'Segoe UI', sans-serif;

/* Monospace - For technical info */
--font-mono: 'JetBrains Mono', 'Consolas', monospace;
```

### Component Style Guide

#### Buttons
- Solid buttons: Navy background, cream text
- Outline buttons: Navy border, navy text
- Ghost buttons: No border, navy text with underline on hover
- NO rounded-full pills, use subtle 4px radius

#### Cards/Containers
- Light cream background (#faf8f5)
- Subtle border (#d4d0c8)
- NO heavy shadows, use 1px borders
- 2px left border accent for important items

#### Tables (for search results)
- Alternating row colors (cream/white)
- Hover state with left border accent
- Expandable rows for document preview
- Fixed header on scroll

#### Forms
- Underline-style inputs (not boxed)
- Labels above inputs
- Inline validation messages

---

## File-by-File Implementation Order

### Week 1: Infrastructure + Indexer

1. `docker-compose.yml` - Complete orchestration
2. `.env.example` - Environment template
3. `indexer/requirements.txt` - Python dependencies
4. `indexer/Dockerfile` - Python service container
5. `indexer/config.py` - Configuration management
6. `indexer/services/embedding_service.py` - Embedding generation
7. `indexer/services/ocr_service.py` - OCR processing
8. `indexer/services/pdf_processor.py` - PDF handling
9. `indexer/services/milvus_service.py` - Vector operations
10. `indexer/services/file_watcher.py` - Directory monitoring
11. `indexer/main.py` - FastAPI application
12. `scripts/init-milvus.py` - Collection initialization

### Week 2: Next.js Application

13. `app/package.json` - Dependencies
14. `app/tailwind.config.ts` - Custom design system
15. `app/src/app/globals.css` - Global styles
16. `app/prisma/schema.prisma` - Database schema
17. `app/src/lib/milvus.ts` - Milvus client
18. `app/src/lib/auth.ts` - Authentication
19. `app/src/lib/rbac.ts` - Access control
20. `app/src/components/ui/*` - Custom UI components
21. `app/src/components/search/*` - Search components
22. `app/src/components/document/*` - Document viewer
23. `app/src/app/page.tsx` - Home/Search page
24. `app/src/app/search/page.tsx` - Results page
25. `app/src/app/document/[id]/page.tsx` - Document viewer
26. `app/src/app/api/search/route.ts` - Search API
27. `app/src/app/api/document/[id]/route.ts` - Document API
28. `app/src/app/(auth)/*` - Authentication pages
29. `app/src/app/admin/*` - Admin dashboard

---

## Critical Implementation Notes

### 1. Embedding Consistency
Always use the same model for indexing and searching. Store model version in metadata.

### 2. Text Chunking Strategy
- Index by page (not arbitrary chunks)
- Store page number with each vector
- Enables precise page-level results

### 3. Hybrid Search Scoring
```python
# Combine scores (adjust weights as needed)
final_score = (0.4 * keyword_score) + (0.6 * semantic_score)
```

### 4. RBAC at Query Time
Apply division filter BEFORE search, not after. This ensures:
- No unauthorized data leakage
- Better performance (smaller search space)

### 5. OCR Quality
- Use `--psm 1` for automatic page segmentation
- Enable both `fra` and `eng` language packs
- Preprocess images (deskew, denoise) for better results

### 6. Error Handling
- Graceful degradation if embedding service fails
- Fallback to keyword-only search
- Queue failed indexing jobs for retry

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Search latency (p95) | < 500ms |
| Indexing speed | > 10 pages/second |
| OCR accuracy | > 95% for clean scans |
| Cross-lingual recall | > 80% |
| UI load time | < 2 seconds |
| Uptime | > 99.5% |

---

## Next Steps

1. Review and approve this plan
2. Begin Phase 1: Infrastructure Setup
3. Iterate based on testing feedback

---

*Document Version: 1.0*
*Created: January 6, 2026*
