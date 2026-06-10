import io
import logging
from markitdown import MarkItDown
from app.core.config import get_settings

logger = logging.getLogger(__name__)

def parse_file_to_markdown(file_bytes: bytes, filename: str, title: str = "Document") -> str:
    """
    Parses any supported document bytes (PDF, DOCX, XLSX, CSV, PPTX, HTML, ZIP, etc.)
    into standard Markdown using Microsoft MarkItDown.
    """
    try:
        # Determine the file extension to assist MarkItDown
        ext = f".{filename.rsplit('.', 1)[-1].lower()}" if "." in filename else ".txt"
        
        settings = get_settings()
        llm_client = None
        llm_model = None

        # Create MarkItDown instance (currently using local parsing without LLM)
        md_converter = MarkItDown(llm_client=llm_client, llm_model=llm_model)
        
        stream = io.BytesIO(file_bytes)
        result = md_converter.convert_stream(stream, file_extension=ext)
        
        content = result.text_content or ""
        
        # Avoid duplicate title if the parsed document already starts with the title
        if content.strip().startswith(f"# {title}"):
            return content
            
        return f"# {title}\n\n{content}"
    except Exception as e:
        logger.error(f"MarkItDown conversion failed for {filename}: {e}", exc_info=True)
        # Fallback to plain text decode if something goes wrong
        try:
            fallback_text = file_bytes.decode("utf-8", errors="ignore")
            return f"# {title}\n\n{fallback_text}"
        except Exception:
            raise ValueError(f"Failed to parse file {filename}: {e}")

# Backward compatibility functions
def parse_pdf_to_markdown(file_bytes: bytes, title: str = "PDF Document") -> str:
    return parse_file_to_markdown(file_bytes, "document.pdf", title)

def parse_docx_to_markdown(file_bytes: bytes, title: str = "Word Document") -> str:
    return parse_file_to_markdown(file_bytes, "document.docx", title)

def parse_xlsx_to_markdown(file_bytes: bytes, title: str = "Excel Sheet") -> str:
    return parse_file_to_markdown(file_bytes, "document.xlsx", title)

def parse_csv_to_markdown(file_bytes: bytes, title: str = "CSV Data") -> str:
    return parse_file_to_markdown(file_bytes, "document.csv", title)

