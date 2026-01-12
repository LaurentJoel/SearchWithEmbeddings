#!/usr/bin/env python3
"""
Milvus Collection Initialization Script
Creates the document collection with proper schema if it doesn't exist.
"""

import sys
import time
from pymilvus import (
    connections,
    utility,
    Collection,
    FieldSchema,
    CollectionSchema,
    DataType
)

# Configuration
MILVUS_HOST = "localhost"
MILVUS_PORT = "19530"
COLLECTION_NAME = "documents"
EMBEDDING_DIM = 384  # paraphrase-multilingual-MiniLM-L12-v2


def wait_for_milvus(max_retries: int = 30, delay: int = 2):
    """Wait for Milvus to be ready."""
    print("Waiting for Milvus to be ready...")
    
    for i in range(max_retries):
        try:
            connections.connect(
                alias="default",
                host=MILVUS_HOST,
                port=MILVUS_PORT
            )
            print("✓ Connected to Milvus")
            return True
        except Exception as e:
            print(f"  Attempt {i+1}/{max_retries}: {e}")
            time.sleep(delay)
    
    print("✗ Failed to connect to Milvus")
    return False


def create_collection():
    """Create the documents collection with proper schema."""
    
    # Check if collection already exists
    if utility.has_collection(COLLECTION_NAME):
        print(f"Collection '{COLLECTION_NAME}' already exists")
        collection = Collection(COLLECTION_NAME)
        print(f"  - Entities: {collection.num_entities}")
        return collection
    
    print(f"Creating collection '{COLLECTION_NAME}'...")
    
    # Define fields
    fields = [
        FieldSchema(
            name="id",
            dtype=DataType.VARCHAR,
            max_length=512,
            is_primary=True,
            description="Unique document chunk ID"
        ),
        FieldSchema(
            name="embedding",
            dtype=DataType.FLOAT_VECTOR,
            dim=EMBEDDING_DIM,
            description="Text embedding vector"
        ),
        FieldSchema(
            name="file_path",
            dtype=DataType.VARCHAR,
            max_length=1024,
            description="Full path to the document file"
        ),
        FieldSchema(
            name="file_name",
            dtype=DataType.VARCHAR,
            max_length=256,
            description="Document file name"
        ),
        FieldSchema(
            name="page_number",
            dtype=DataType.INT32,
            description="Page number in the document"
        ),
        FieldSchema(
            name="text_content",
            dtype=DataType.VARCHAR,
            max_length=65535,
            description="Text content of the page"
        ),
        FieldSchema(
            name="division",
            dtype=DataType.VARCHAR,
            max_length=64,
            description="Division/department code"
        ),
        FieldSchema(
            name="file_type",
            dtype=DataType.VARCHAR,
            max_length=16,
            description="File extension type"
        ),
        FieldSchema(
            name="file_size",
            dtype=DataType.INT64,
            description="File size in bytes"
        ),
        FieldSchema(
            name="total_pages",
            dtype=DataType.INT32,
            description="Total number of pages in document"
        ),
        FieldSchema(
            name="created_at",
            dtype=DataType.VARCHAR,
            max_length=32,
            description="Document creation timestamp"
        ),
        FieldSchema(
            name="indexed_at",
            dtype=DataType.VARCHAR,
            max_length=32,
            description="Indexing timestamp"
        ),
        FieldSchema(
            name="ocr_applied",
            dtype=DataType.BOOL,
            description="Whether OCR was used for extraction"
        ),
        FieldSchema(
            name="ocr_confidence",
            dtype=DataType.FLOAT,
            description="OCR confidence score (0-1)"
        ),
        FieldSchema(
            name="language",
            dtype=DataType.VARCHAR,
            max_length=8,
            description="Detected language code"
        ),
    ]
    
    # Create schema
    schema = CollectionSchema(
        fields=fields,
        description="Document search collection with semantic embeddings",
        enable_dynamic_field=True
    )
    
    # Create collection
    collection = Collection(
        name=COLLECTION_NAME,
        schema=schema,
        consistency_level="Strong"
    )
    
    print(f"✓ Collection '{COLLECTION_NAME}' created")
    
    # Create indexes
    print("Creating indexes...")
    
    # Vector index for similarity search (IVF_FLAT for balanced performance)
    vector_index_params = {
        "metric_type": "COSINE",
        "index_type": "IVF_FLAT",
        "params": {"nlist": 128}
    }
    collection.create_index(
        field_name="embedding",
        index_params=vector_index_params,
        index_name="embedding_idx"
    )
    print("  ✓ Vector index created")
    
    # Scalar indexes for filtering
    collection.create_index(
        field_name="division",
        index_name="division_idx"
    )
    collection.create_index(
        field_name="file_type",
        index_name="file_type_idx"
    )
    collection.create_index(
        field_name="file_name",
        index_name="file_name_idx"
    )
    print("  ✓ Scalar indexes created")
    
    # Load collection into memory
    print("Loading collection into memory...")
    collection.load()
    print("✓ Collection loaded and ready")
    
    return collection


def main():
    """Main entry point."""
    print("=" * 50)
    print("Milvus Collection Initialization")
    print("=" * 50)
    
    # Wait for Milvus
    if not wait_for_milvus():
        sys.exit(1)
    
    # Create collection
    try:
        collection = create_collection()
        
        print("\n" + "=" * 50)
        print("Initialization Complete")
        print("=" * 50)
        print(f"Collection: {COLLECTION_NAME}")
        print(f"Embedding Dimension: {EMBEDDING_DIM}")
        print(f"Entities: {collection.num_entities}")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)
    finally:
        connections.disconnect("default")


if __name__ == "__main__":
    main()
