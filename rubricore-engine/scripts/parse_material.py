import sys
import os
import json
import csv
import traceback
from docx import Document
from docx.text.paragraph import Paragraph
from docx.table import Table
import openpyxl

def iter_block_items(parent):
    """
    Generate a sequence of Paragraph and Table objects in the order they appear in the document.
    """
    from docx.document import Document as DocumentClass
    
    if isinstance(parent, DocumentClass):
        parent_elm = parent.element.body
    else:
        parent_elm = parent._element
        
    for child in parent_elm.iterchildren():
        if child.tag.endswith('p'):
            yield Paragraph(child, parent)
        elif child.tag.endswith('tbl'):
            yield Table(child, parent)

def escape_html(text):
    if not text:
        return ""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&#x27;")

def docx_to_html_and_markdown(docx_path):
    doc = Document(docx_path)
    html_parts = []
    md_parts = []
    raw_texts = []
    
    in_list = False
    list_type = None # 'ul' or 'ol'
    
    for block in iter_block_items(doc):
        if isinstance(block, Paragraph):
            text = block.text.strip()
            if not text:
                continue
                
            raw_texts.append(block.text)
            
            # Check style
            style_name = block.style.name.lower()
            
            # Simple list item check
            is_list_item = False
            current_list_type = None
            if "list bullet" in style_name or text.startswith("•") or text.startswith("-"):
                is_list_item = True
                current_list_type = "ul"
                if text.startswith("•") or text.startswith("-"):
                    text = text[1:].strip()
            elif "list number" in style_name or (text and text[0].isdigit() and (text.startswith(tuple(f"{i}." for i in range(10))) or text.startswith(tuple(f"{i})" for i in range(10))))):
                is_list_item = True
                current_list_type = "ol"
                # Strip prefix if it starts with digit + . or )
                # e.g. "1. Hello" -> "Hello"
                parts = text.split(".", 1)
                if len(parts) > 1 and parts[0].isdigit():
                    text = parts[1].strip()
                else:
                    parts = text.split(")", 1)
                    if len(parts) > 1 and parts[0].isdigit():
                        text = parts[1].strip()
            
            if is_list_item:
                if not in_list or list_type != current_list_type:
                    if in_list:
                        html_parts.append(f"</{list_type}>")
                    html_parts.append(f"<{current_list_type}>")
                    in_list = True
                    list_type = current_list_type
            else:
                if in_list:
                    html_parts.append(f"</{list_type}>")
                    in_list = False
                    list_type = None
                    
            # Parse formatting (runs)
            html_text = ""
            md_text = ""
            for run in block.runs:
                run_text = escape_html(run.text)
                md_run_text = run.text
                if not run_text:
                    continue
                
                # Check formatting
                is_bold = run.bold
                is_italic = run.italic
                is_underline = run.underline
                
                # HTML wrappers
                run_html = run_text
                if is_bold:
                    run_html = f"<strong>{run_html}</strong>"
                if is_italic:
                    run_html = f"<em>{run_html}</em>"
                if is_underline:
                    run_html = f"<u>{run_html}</u>"
                html_text += run_html
                
                # MD wrappers
                run_md = md_run_text
                if is_bold and is_italic:
                    run_md = f"***{run_md}***"
                elif is_bold:
                    run_md = f"**{run_md}**"
                elif is_italic:
                    run_md = f"*{run_md}*"
                # Note: Markdown doesn't have standard underline, we can ignore or use <u>
                if is_underline:
                    run_md = f"<u>{run_md}</u>"
                md_text += run_md
            
            # Headings
            if "heading 1" in style_name:
                html_parts.append(f"<h1>{html_text}</h1>")
                md_parts.append(f"# {md_text}\n")
            elif "heading 2" in style_name:
                html_parts.append(f"<h2>{html_text}</h2>")
                md_parts.append(f"## {md_text}\n")
            elif "heading 3" in style_name:
                html_parts.append(f"<h3>{html_text}</h3>")
                md_parts.append(f"### {md_text}\n")
            elif "heading 4" in style_name:
                html_parts.append(f"<h4>{html_text}</h4>")
                md_parts.append(f"#### {md_text}\n")
            elif is_list_item:
                html_parts.append(f"<li>{html_text}</li>")
                bullet = "-" if list_type == "ul" else "1."
                md_parts.append(f"{bullet} {md_text}")
            else:
                html_parts.append(f"<p>{html_text}</p>")
                md_parts.append(f"{md_text}\n")
                
        elif isinstance(block, Table):
            if in_list:
                html_parts.append(f"</{list_type}>")
                in_list = False
                list_type = None
                
            html_parts.append('<div class="overflow-x-auto my-6"><table class="min-w-full border-collapse border border-slate-200">')
            
            md_table_rows = []
            
            for r_idx, row in enumerate(block.rows):
                html_parts.append("<tr>")
                row_cells = []
                for c_idx, cell in enumerate(row.cells):
                    cell_text = cell.text.strip()
                    raw_texts.append(cell_text)
                    escaped_cell = escape_html(cell_text)
                    
                    if r_idx == 0:
                        html_parts.append(f'<th class="border border-slate-300 px-4 py-2 bg-slate-50 text-left font-semibold text-slate-700">{escaped_cell}</th>')
                    else:
                        html_parts.append(f'<td class="border border-slate-300 px-4 py-2 text-slate-600">{escaped_cell}</td>')
                        
                    row_cells.append(cell_text.replace("\n", " ").replace("|", "\\|"))
                html_parts.append("</tr>")
                
                md_table_rows.append("| " + " | ".join(row_cells) + " |")
                if r_idx == 0:
                    # Add divider
                    md_table_rows.append("| " + " | ".join(["---"] * len(row_cells)) + " |")
            
            html_parts.append("</table></div>")
            md_parts.append("\n".join(md_table_rows) + "\n")
            
    if in_list:
        html_parts.append(f"</{list_type}>")
        
    viewer_html = "\n".join(html_parts)
    viewer_markdown = "\n".join(md_parts)
    extracted_text = "\n".join(raw_texts)
    
    return {
        "viewer_html": viewer_html,
        "viewer_markdown": viewer_markdown,
        "extracted_text": extracted_text
    }

def parse_csv(csv_path):
    headers = []
    rows = []
    total_rows = 0
    total_cols = 0
    
    with open(csv_path, mode='r', encoding='utf-8-sig', errors='ignore') as f:
        reader = csv.reader(f)
        try:
            headers = next(reader)
            total_cols = len(headers)
        except StopIteration:
            headers = []
            
        for row in reader:
            total_rows += 1
            if len(rows) < 15:
                rows.append(row)
                
    extracted_lines = [", ".join(headers)] if headers else []
    for r in rows:
        extracted_lines.append(", ".join(r))
    extracted_text = "\n".join(extracted_lines)
    
    return {
        "headers": headers,
        "rows": rows,
        "row_count": total_rows,
        "col_count": total_cols,
        "sheet_names": []
    }, extracted_text

def parse_xlsx(xlsx_path):
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    sheet_names = wb.sheetnames
    
    # Use active or first sheet
    sheet = wb.active if wb.active else wb[sheet_names[0]]
    
    headers = []
    rows = []
    total_rows = 0
    total_cols = sheet.max_column
    
    for r_idx, row in enumerate(sheet.iter_rows(values_only=True)):
        if r_idx == 0:
            headers = [str(val) if val is not None else "" for val in row]
        else:
            total_rows += 1
            if len(rows) < 15:
                rows.append([str(val) if val is not None else "" for val in row])
                
    extracted_lines = [", ".join(headers)] if headers else []
    for r in rows:
        extracted_lines.append(", ".join(r))
    extracted_text = "\n".join(extracted_lines)
    
    return {
        "headers": headers,
        "rows": rows,
        "row_count": total_rows,
        "col_count": total_cols,
        "sheet_names": sheet_names
    }, extracted_text

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}), file=sys.stderr)
        sys.exit(1)
        
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(json.dumps({"error": f"File path does not exist: {file_path}"}), file=sys.stderr)
        sys.exit(1)
        
    _, ext = os.path.splitext(file_path.lower())
    
    try:
        if ext == '.docx':
            result = docx_to_html_and_markdown(file_path)
            output = {
                "viewer_artifact": {
                    "type": "docx",
                    "viewer_html": result["viewer_html"],
                    "viewer_markdown": result["viewer_markdown"]
                },
                "extracted_text": result["extracted_text"]
            }
        elif ext == '.csv':
            preview, text = parse_csv(file_path)
            output = {
                "viewer_artifact": {
                    "type": "tabular",
                    **preview
                },
                "extracted_text": text
            }
        elif ext == '.xlsx' or ext == '.xls':
            preview, text = parse_xlsx(file_path)
            output = {
                "viewer_artifact": {
                    "type": "tabular",
                    **preview
                },
                "extracted_text": text
            }
        else:
            print(json.dumps({"error": f"Unsupported file extension: {ext}"}), file=sys.stderr)
            sys.exit(1)
            
        print(json.dumps(output))
        
    except Exception as e:
        err_msg = f"Error processing file: {str(e)}\n{traceback.format_exc()}"
        print(json.dumps({"error": err_msg}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
