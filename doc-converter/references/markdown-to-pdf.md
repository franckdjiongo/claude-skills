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
