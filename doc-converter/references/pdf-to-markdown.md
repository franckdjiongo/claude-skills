## PDF to Markdown

### Text-Based PDFs

```python
import pdfplumber
import re

def pdf_to_markdown(pdf_path, output_path):
    """Extract PDF content and convert to clean markdown."""
    md_content = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            
            # Extract tables separately
            tables = page.extract_tables()
            for table in tables:
                if table:
                    md_content.append(table_to_markdown(table))
            
            # Add page text (clean and format)
            if text.strip():
                md_content.append(clean_text_for_markdown(text))
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(md_content))

def table_to_markdown(table):
    """Convert extracted table to markdown format."""
    if not table or not table[0]:
        return ""
    
    # Clean cells
    clean_table = [[str(cell or '').strip() for cell in row] for row in table]
    
    # Build markdown table
    header = '| ' + ' | '.join(clean_table[0]) + ' |'
    separator = '|' + '|'.join(['---' for _ in clean_table[0]]) + '|'
    rows = ['| ' + ' | '.join(row) + ' |' for row in clean_table[1:]]
    
    return '\n'.join([header, separator] + rows)

def clean_text_for_markdown(text):
    """Clean extracted text and apply basic markdown formatting."""
    lines = text.split('\n')
    result = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Detect headings (all caps, short lines, numbered sections)
        if re.match(r'^\d+\.?\s+[A-Z]', line) and len(line) < 80:
            result.append(f'## {line}')
        elif line.isupper() and len(line) < 60:
            result.append(f'# {line}')
        elif re.match(r'^#{1,3}\s', line):
            result.append(line)  # Already formatted
        else:
            result.append(line)
    
    return '\n\n'.join(result)
```

### Scanned/Image PDFs (OCR)

```python
import pytesseract
from pdf2image import convert_from_path

def ocr_pdf_to_markdown(pdf_path, output_path):
    """Convert scanned PDF to markdown using OCR."""
    images = convert_from_path(pdf_path, dpi=300)
    
    all_text = []
    for i, image in enumerate(images):
        text = pytesseract.image_to_string(image)
        all_text.append(f"<!-- Page {i+1} -->\n\n{text}")
    
    content = '\n\n---\n\n'.join(all_text)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
```
