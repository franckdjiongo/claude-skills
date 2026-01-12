---
name: doc-converter
description: "Convert documents between formats: PDF to Markdown, DOCX to Markdown, Markdown to PDF, Markdown to DOCX. Use when the user asks to (1) transform a PDF or Word document into clean markdown format, (2) convert markdown content to a downloadable PDF or Word document, (3) extract content from technical documents, reports, or guides while preserving structure, or (4) create professional documents from markdown notes or content."
---

# Document Format Converter

Convert documents between PDF, DOCX, and Markdown formats while preserving structure, tables, code blocks, and formatting.

## Workflow Decision Tree

### Input → Markdown
| Source | Method |
|--------|--------|
| PDF (text-based) | `pdfplumber` for text extraction, manual markdown formatting |
| PDF (scanned/image) | `pytesseract` OCR → markdown formatting |
| DOCX | `pandoc` conversion with post-processing |

### Markdown → Output
| Target | Method |
|--------|--------|
| PDF | `pandoc` with PDF engine or Python `reportlab` |
| DOCX | `pandoc` direct conversion |

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

## DOCX to Markdown

### Using Pandoc (Recommended)

```bash
# Basic conversion
pandoc input.docx -o output.md

# With options for better formatting
pandoc input.docx -o output.md --wrap=none --extract-media=./media

# Preserve tracked changes
pandoc --track-changes=all input.docx -o output.md
```

### Post-Processing Script

```python
import re

def clean_pandoc_markdown(input_path, output_path):
    """Clean up pandoc-generated markdown."""
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove excessive blank lines
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    # Fix heading spacing
    content = re.sub(r'(\n#{1,6}\s)', r'\n\1', content)
    
    # Clean up list formatting
    content = re.sub(r'^(\s*)-\s+', r'\1- ', content, flags=re.MULTILINE)
    
    # Remove Word-specific artifacts
    content = re.sub(r'\{[^}]+\}', '', content)  # Attribute blocks
    content = re.sub(r'\[\]{[^}]+}', '', content)  # Empty spans
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content.strip())
```

## Markdown to PDF

### Using Pandoc

```bash
# Basic conversion (requires LaTeX)
pandoc input.md -o output.pdf

# With styling
pandoc input.md -o output.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V fontsize=11pt

# With table of contents
pandoc input.md -o output.pdf --toc --toc-depth=3

# With syntax highlighting for code
pandoc input.md -o output.pdf --highlight-style=tango
```

### Using Python (reportlab)

```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Preformatted, Table
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import re

def markdown_to_pdf(md_path, pdf_path):
    """Convert markdown to PDF using reportlab."""
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    doc = SimpleDocTemplate(pdf_path, pagesize=letter,
                           leftMargin=inch, rightMargin=inch,
                           topMargin=inch, bottomMargin=inch)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Code', fontName='Courier', fontSize=9,
                              backColor='#f5f5f5', leftIndent=20))
    
    story = []
    lines = content.split('\n')
    in_code_block = False
    code_buffer = []
    
    for line in lines:
        # Code blocks
        if line.startswith('```'):
            if in_code_block:
                story.append(Preformatted('\n'.join(code_buffer), styles['Code']))
                code_buffer = []
            in_code_block = not in_code_block
            continue
        
        if in_code_block:
            code_buffer.append(line)
            continue
        
        # Headings
        if line.startswith('# '):
            story.append(Paragraph(line[2:], styles['Heading1']))
        elif line.startswith('## '):
            story.append(Paragraph(line[3:], styles['Heading2']))
        elif line.startswith('### '):
            story.append(Paragraph(line[4:], styles['Heading3']))
        elif line.strip():
            # Convert markdown formatting
            text = convert_inline_markdown(line)
            story.append(Paragraph(text, styles['Normal']))
            story.append(Spacer(1, 6))
    
    doc.build(story)

def convert_inline_markdown(text):
    """Convert inline markdown to reportlab markup."""
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
    text = re.sub(r'`(.+?)`', r'<font face="Courier">\1</font>', text)
    return text
```

## Markdown to DOCX

### Using Pandoc

```bash
# Basic conversion
pandoc input.md -o output.docx

# With reference document for styling
pandoc input.md -o output.docx --reference-doc=template.docx

# With table of contents
pandoc input.md -o output.docx --toc
```

### Using Python (python-docx)

```python
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
import re

def markdown_to_docx(md_path, docx_path):
    """Convert markdown to DOCX."""
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    doc = Document()
    lines = content.split('\n')
    in_code_block = False
    code_buffer = []
    in_table = False
    table_rows = []
    
    for line in lines:
        # Code blocks
        if line.startswith('```'):
            if in_code_block:
                add_code_block(doc, '\n'.join(code_buffer))
                code_buffer = []
            in_code_block = not in_code_block
            continue
        
        if in_code_block:
            code_buffer.append(line)
            continue
        
        # Tables
        if line.startswith('|'):
            if '---' in line:
                continue  # Skip separator
            table_rows.append([c.strip() for c in line.strip('|').split('|')])
            in_table = True
            continue
        elif in_table and table_rows:
            add_table(doc, table_rows)
            table_rows = []
            in_table = False
        
        # Headings
        if line.startswith('# '):
            doc.add_heading(line[2:], level=1)
        elif line.startswith('## '):
            doc.add_heading(line[3:], level=2)
        elif line.startswith('### '):
            doc.add_heading(line[4:], level=3)
        elif line.startswith('- '):
            doc.add_paragraph(line[2:], style='List Bullet')
        elif re.match(r'^\d+\.\s', line):
            doc.add_paragraph(re.sub(r'^\d+\.\s', '', line), style='List Number')
        elif line.strip():
            p = doc.add_paragraph()
            add_formatted_text(p, line)
    
    # Handle remaining table
    if table_rows:
        add_table(doc, table_rows)
    
    doc.save(docx_path)

def add_code_block(doc, code):
    """Add a code block to the document."""
    p = doc.add_paragraph()
    run = p.add_run(code)
    run.font.name = 'Courier New'
    run.font.size = Pt(9)

def add_table(doc, rows):
    """Add a table to the document."""
    if not rows:
        return
    table = doc.add_table(rows=len(rows), cols=len(rows[0]))
    table.style = 'Table Grid'
    for i, row in enumerate(rows):
        for j, cell in enumerate(row):
            table.rows[i].cells[j].text = cell

def add_formatted_text(paragraph, text):
    """Add formatted text handling bold/italic/code."""
    parts = re.split(r'(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)', text)
    for part in parts:
        if part.startswith('**') and part.endswith('**'):
            run = paragraph.add_run(part[2:-2])
            run.bold = True
        elif part.startswith('*') and part.endswith('*'):
            run = paragraph.add_run(part[1:-1])
            run.italic = True
        elif part.startswith('`') and part.endswith('`'):
            run = paragraph.add_run(part[1:-1])
            run.font.name = 'Courier New'
        else:
            paragraph.add_run(part)
```

## Complete Conversion Workflow

For complex documents, follow this workflow:

1. **Analyze source document**: Identify structure (headings, tables, code, images)
2. **Choose conversion method**: Select based on source format and quality
3. **Extract content**: Use appropriate tool for source format
4. **Clean and format**: Apply post-processing to fix artifacts
5. **Validate output**: Verify structure, tables, and formatting preserved
6. **Save to outputs**: Place final file in `/mnt/user-data/outputs/`

## Dependencies

```bash
# PDF processing
pip install pdfplumber pypdf reportlab --break-system-packages

# OCR for scanned PDFs
pip install pytesseract pdf2image --break-system-packages
sudo apt-get install -y tesseract-ocr poppler-utils

# DOCX processing
pip install python-docx --break-system-packages

# Pandoc (for all conversions)
sudo apt-get install -y pandoc

# LaTeX for PDF generation via pandoc
sudo apt-get install -y texlive-xetex texlive-fonts-recommended
```

## Quality Checklist

Before delivering converted document:

- [ ] Headings properly formatted with correct hierarchy
- [ ] Tables converted with proper alignment
- [ ] Code blocks preserved with syntax indication
- [ ] Lists (bulleted/numbered) properly formatted
- [ ] Bold/italic/code formatting preserved
- [ ] Page breaks handled appropriately
- [ ] Images extracted/referenced (if applicable)
- [ ] No conversion artifacts or garbage characters
