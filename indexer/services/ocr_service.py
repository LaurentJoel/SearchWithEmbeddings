# ==============================================================================
# OCR Service - Tesseract-based text extraction from images
# ==============================================================================

import pytesseract
from PIL import Image
from pathlib import Path
from typing import Optional, Tuple
from loguru import logger
import io

from config import get_settings


class OCRService:
    """
    Service for extracting text from images using Tesseract OCR.
    Supports French and English languages.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.languages = self.settings.tesseract_languages
        self.dpi = self.settings.ocr_dpi
        
        # Verify Tesseract is available
        try:
            pytesseract.get_tesseract_version()
            logger.info(f"Tesseract OCR initialized with languages: {self.languages}")
        except Exception as e:
            logger.error(f"Tesseract not available: {e}")
            raise
    
    def extract_text_from_image(
        self,
        image: Image.Image,
        lang: Optional[str] = None
    ) -> Tuple[str, float]:
        """
        Extract text from a PIL Image.
        
        Args:
            image: PIL Image object
            lang: Language code override (default: fra+eng)
            
        Returns:
            Tuple of (extracted_text, confidence_score)
        """
        lang = lang or self.languages
        
        try:
            # Configure Tesseract
            custom_config = r'--oem 3 --psm 1'  # LSTM engine, auto page segmentation
            
            # Get text with confidence data
            data = pytesseract.image_to_data(
                image,
                lang=lang,
                config=custom_config,
                output_type=pytesseract.Output.DICT
            )
            
            # Calculate average confidence
            confidences = [
                int(c) for c in data['conf'] 
                if c != '-1' and str(c).isdigit()
            ]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            
            # Extract text
            text = pytesseract.image_to_string(
                image,
                lang=lang,
                config=custom_config
            )
            
            return text.strip(), avg_confidence / 100.0
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            return "", 0.0
    
    def extract_text_from_file(
        self,
        file_path: str,
        lang: Optional[str] = None
    ) -> Tuple[str, float]:
        """
        Extract text from an image file.
        
        Args:
            file_path: Path to the image file
            lang: Language code override
            
        Returns:
            Tuple of (extracted_text, confidence_score)
        """
        path = Path(file_path)
        
        if not path.exists():
            logger.error(f"File not found: {file_path}")
            return "", 0.0
        
        try:
            image = Image.open(path)
            return self.extract_text_from_image(image, lang)
        except Exception as e:
            logger.error(f"Failed to open image {file_path}: {e}")
            return "", 0.0
    
    def extract_text_from_bytes(
        self,
        image_bytes: bytes,
        lang: Optional[str] = None
    ) -> Tuple[str, float]:
        """
        Extract text from image bytes.
        
        Args:
            image_bytes: Image data as bytes
            lang: Language code override
            
        Returns:
            Tuple of (extracted_text, confidence_score)
        """
        try:
            image = Image.open(io.BytesIO(image_bytes))
            return self.extract_text_from_image(image, lang)
        except Exception as e:
            logger.error(f"Failed to process image bytes: {e}")
            return "", 0.0
    
    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image for better OCR results.
        
        Args:
            image: PIL Image
            
        Returns:
            Preprocessed PIL Image
        """
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')
        
        # Increase contrast (simple thresholding)
        # This can be enhanced with more sophisticated preprocessing
        
        return image


# Global instance
ocr_service = OCRService()
