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
