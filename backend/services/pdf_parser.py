"""Extract plain text from PDF bytes (e.g. uploaded CV)."""

import io

import PyPDF2


def parse_pdf(file_bytes: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text.strip()
