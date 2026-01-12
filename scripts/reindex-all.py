#!/usr/bin/env python3
"""
Reindex All Documents Script
Scans the documents directory and reindexes all files.
"""

import os
import sys
import argparse
import httpx
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List

# Configuration
INDEXER_URL = os.getenv("INDEXER_URL", "http://localhost:8000")
DOCUMENTS_DIR = os.getenv("DOCUMENTS_DIR", "./documents")
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt", ".txt"}


def get_all_documents(directory: str) -> List[Path]:
    """Recursively find all supported documents."""
    documents = []
    base_path = Path(directory)
    
    for ext in SUPPORTED_EXTENSIONS:
        documents.extend(base_path.rglob(f"*{ext}"))
    
    return sorted(documents)


def index_file(file_path: Path, base_dir: Path) -> dict:
    """Index a single file."""
    relative_path = file_path.relative_to(base_dir)
    
    try:
        response = httpx.post(
            f"{INDEXER_URL}/index/file",
            json={"file_path": str(file_path)},
            timeout=300.0  # 5 minutes for large files
        )
        response.raise_for_status()
        result = response.json()
        return {
            "file": str(relative_path),
            "success": True,
            "pages": result.get("pages_indexed", 0)
        }
    except Exception as e:
        return {
            "file": str(relative_path),
            "success": False,
            "error": str(e)
        }


def main():
    parser = argparse.ArgumentParser(description="Reindex all documents")
    parser.add_argument(
        "--directory", "-d",
        default=DOCUMENTS_DIR,
        help="Documents directory to scan"
    )
    parser.add_argument(
        "--workers", "-w",
        type=int,
        default=4,
        help="Number of parallel workers"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List files without indexing"
    )
    args = parser.parse_args()
    
    # Find all documents
    base_dir = Path(args.directory).resolve()
    print(f"Scanning: {base_dir}")
    
    documents = get_all_documents(str(base_dir))
    total = len(documents)
    
    print(f"Found {total} documents to index\n")
    
    if args.dry_run:
        for doc in documents:
            print(f"  - {doc.relative_to(base_dir)}")
        return
    
    if total == 0:
        print("No documents found")
        return
    
    # Check indexer health
    try:
        health = httpx.get(f"{INDEXER_URL}/status", timeout=5.0)
        health.raise_for_status()
        print(f"✓ Indexer is healthy: {INDEXER_URL}\n")
    except Exception as e:
        print(f"✗ Cannot connect to indexer: {e}")
        sys.exit(1)
    
    # Index files in parallel
    success_count = 0
    error_count = 0
    total_pages = 0
    
    print("=" * 60)
    print("Starting indexation...")
    print("=" * 60)
    
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(index_file, doc, base_dir): doc 
            for doc in documents
        }
        
        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            
            status = "✓" if result["success"] else "✗"
            print(f"[{i}/{total}] {status} {result['file']}")
            
            if result["success"]:
                success_count += 1
                total_pages += result.get("pages", 0)
                if result.get("pages"):
                    print(f"         ({result['pages']} pages)")
            else:
                error_count += 1
                print(f"         Error: {result.get('error', 'Unknown')}")
    
    # Summary
    print("\n" + "=" * 60)
    print("Indexation Complete")
    print("=" * 60)
    print(f"Total documents: {total}")
    print(f"  ✓ Success: {success_count}")
    print(f"  ✗ Errors:  {error_count}")
    print(f"  Pages indexed: {total_pages}")
    
    if error_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
