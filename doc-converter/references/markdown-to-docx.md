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
