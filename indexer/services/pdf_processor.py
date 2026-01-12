# ==============================================================================
# PDF Processor - Text extraction from PDF files
# ==============================================================================

import fitz  # PyMuPDF
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from loguru import logger
from PIL import Image
import io

from services.ocr_service import ocr_service
from config import get_settings


@dataclass
class PageContent:
    """Content extracted from a single PDF page."""
    page_number: int
    text: str
    is_scanned: bool
    confidence: float
    word_count: int
    language: Optional[str] = None


@dataclass
class DocumentContent:
    """Complete extracted content from a PDF document."""
    file_path: str
    file_name: str
    total_pages: int
    pages: List[PageContent]
    file_size: int
    is_mostly_scanned: bool
    
    def get_full_text(self) -> str:
        """Get concatenated text from all pages."""
        return "\n\n".join(page.text for page in self.pages if page.text)


class PDFProcessor:
    """
    Service for extracting text from PDF files.
    Handles both digital PDFs and scanned documents (using OCR).
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.ocr_dpi = self.settings.ocr_dpi
        self.min_text_length = 50  # Minimum chars to consider page as digital
    
    def process_pdf(self, file_path: str) -> Optional[DocumentContent]:
        """
        Process a PDF file and extract text from all pages.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            DocumentContent object with extracted text, or None on failure
        """
        path = Path(file_path)
        
        if not path.exists():
            logger.error(f"PDF file not found: {file_path}")
            return None
        
        if not path.suffix.lower() == '.pdf':
            logger.error(f"Not a PDF file: {file_path}")
            return None
        
        try:
            doc = fitz.open(file_path)
            pages: List[PageContent] = []
            scanned_count = 0
            
            logger.info(f"Processing PDF: {path.name} ({doc.page_count} pages)")
            
            for page_num in range(doc.page_count):
                page_content = self._process_page(doc, page_num)
                pages.append(page_content)
                
                if page_content.is_scanned:
                    scanned_count += 1
            
            doc.close()
            
            is_mostly_scanned = scanned_count > (len(pages) / 2)
            
            result = DocumentContent(
                file_path=str(path.absolute()),
                file_name=path.name,
                total_pages=len(pages),
                pages=pages,
                file_size=path.stat().st_size,
                is_mostly_scanned=is_mostly_scanned
            )
            
            logger.info(
                f"Processed {path.name}: {len(pages)} pages, "
                f"{scanned_count} scanned, "
                f"{'mostly scanned' if is_mostly_scanned else 'mostly digital'}"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to process PDF {file_path}: {e}")
            return None
    
    def _process_page(self, doc: fitz.Document, page_num: int) -> PageContent:
        """
        Process a single page of a PDF.
        
        Args:
            doc: PyMuPDF document object
            page_num: Page number (0-indexed)
            
        Returns:
            PageContent object
        """
        page = doc.load_page(page_num)
        
        # Try to extract text directly first
        text = page.get_text("text").strip()
        is_scanned = False
        confidence = 1.0
        
        # If no meaningful text, use OCR
        if len(text) < self.min_text_length:
            is_scanned = True
            text, confidence = self._ocr_page(page)
        
        # Count words
        word_count = len(text.split()) if text else 0
        
        return PageContent(
            page_number=page_num + 1,  # 1-indexed for display
            text=text,
            is_scanned=is_scanned,
            confidence=confidence,
            word_count=word_count
        )
    
    def _ocr_page(self, page: fitz.Page) -> Tuple[str, float]:
        """
        Apply OCR to a PDF page.
        
        Args:
            page: PyMuPDF page object
            
        Returns:
            Tuple of (extracted_text, confidence)
        """
        try:
            # Render page as image
            mat = fitz.Matrix(self.ocr_dpi / 72, self.ocr_dpi / 72)
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PIL Image
            img_bytes = pix.tobytes("png")
            image = Image.open(io.BytesIO(img_bytes))
            
            # Apply OCR
            text, confidence = ocr_service.extract_text_from_image(image)
            
            return text, confidence
            
        except Exception as e:
            logger.error(f"OCR failed for page: {e}")
            return "", 0.0
    
    def get_page_image(
        self,
        file_path: str,
        page_num: int,
        dpi: int = 150
    ) -> Optional[bytes]:
        """
        Render a specific page as an image.
        
        Args:
            file_path: Path to the PDF
            page_num: Page number (1-indexed)
            dpi: Resolution for rendering
            
        Returns:
            PNG image bytes or None
        """
        try:
            doc = fitz.open(file_path)
            
            if page_num < 1 or page_num > doc.page_count:
                logger.error(f"Invalid page number: {page_num}")
                doc.close()
                return None
            
            page = doc.load_page(page_num - 1)  # 0-indexed
            mat = fitz.Matrix(dpi / 72, dpi / 72)
            pix = page.get_pixmap(matrix=mat)
            
            img_bytes = pix.tobytes("png")
            doc.close()
            
            return img_bytes
            
        except Exception as e:
            logger.error(f"Failed to render page image: {e}")
            return None


# Global instance
pdf_processor = PDFProcessor()
