import os
import sys
import json
import re
import requests

sys.stdout.reconfigure(encoding='utf-8')

# Paths
CURRICULUM_PATH = r"docs/apm-theory-curriculum.md"

def load_env_local():
    env = {}
    if not os.path.exists(".env.local"):
        print("Error: .env.local not found.")
        sys.exit(1)
    with open(".env.local", "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                env[key.strip()] = val.strip().strip("'\"")
    return env

ENV = load_env_local()
SUPABASE_URL = ENV.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = ENV.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: credentials not found in .env.local.")
    sys.exit(1)

class SupabaseClient:
    def __init__(self, url, service_key):
        self.url = url
        self.headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    def select(self, table, params=None):
        endpoint = f"{self.url}/rest/v1/{table}"
        res = requests.get(endpoint, headers=self.headers, params=params)
        if res.status_code == 200:
            return res.json()
        print(f"Error reading {table}: {res.status_code} - {res.text}")
        return []

    def update(self, table, record_id, data):
        endpoint = f"{self.url}/rest/v1/{table}"
        params = {"id": f"eq.{record_id}"}
        res = requests.patch(endpoint, json=data, params=params, headers=self.headers)
        if res.status_code not in (200, 204):
            print(f"Failed to update {table} ID {record_id}: Status {res.status_code}, Response: {res.text}")
            res.raise_for_status()
        return res.json() if res.content else None

def flush_table(headers, rows):
    table_html = '<div class="overflow-x-auto my-6 border border-slate-805 rounded-xl shadow-sm"><table class="min-w-full divide-y divide-slate-805 text-xs md:text-sm">'
    table_html += '<thead class="bg-slate-900 text-slate-100 font-bold border-b border-slate-805"><tr>'
    for h in headers:
        table_html += f'<th class="px-4 py-3 text-left font-bold border-r last:border-0 border-slate-805 bg-slate-900 tracking-wider">{h}</th>'
    table_html += '</tr></thead>'
    table_html += '<tbody class="divide-y divide-slate-805 bg-slate-950 text-slate-250">'
    for row in rows:
        table_html += '<tr class="hover:bg-slate-900/30 transition-colors">'
        for cell in row:
            table_html += f'<td class="px-4 py-3 border-r last:border-0 border-slate-805">{cell}</td>'
        table_html += '</tr>'
    table_html += '</tbody></table></div>'
    return table_html

def convert_markdown_to_html(md):
    md = md.replace('\r\n', '\n')
    lines = md.split('\n')
    
    html_lines = []
    in_code = False
    code_lang = ''
    code_content = []
    
    in_list = False
    in_table = False
    table_headers = []
    table_rows = []
    
    def parse_inline(text):
        text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
        text = re.sub(r'`(.*?)`', r'<code class="px-1.5 py-0.5 rounded bg-slate-900 text-slate-100 font-mono text-xs">\1</code>', text)
        text = re.sub(r'\$(.*?)\$', r'\(\1\)', text)
        return text

    i = 0
    while i < len(lines):
        line = lines[i]
        trimmed = line.strip()
        
        if trimmed.startswith('```'):
            if in_code:
                in_code = False
                raw_code = '\n'.join(code_content)
                escaped_code = raw_code.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                
                if code_lang == 'mermaid':
                    html_lines.append(f'<div class="mermaid-block my-6 flex justify-center bg-slate-900/10 border border-slate-850 p-6 rounded-2xl shadow-sm"><pre class="mermaid text-center w-full">{escaped_code}</pre></div>')
                else:
                    html_lines.append(f"""<div class="code-block-wrapper my-6 border border-slate-805 rounded-xl bg-slate-900 overflow-hidden shadow-md font-mono">
  <div class="flex items-center justify-between px-4 py-2 bg-slate-955/20 border-b border-slate-805 text-xs text-slate-400">
    <span class="text-[10px] uppercase font-bold tracking-widest text-slate-300">{code_lang or 'code'}</span>
  </div>
  <pre class="p-4 overflow-x-auto text-xs text-slate-100 leading-relaxed bg-slate-900"><code>{escaped_code}</code></pre>
</div>""")
                code_content = []
                code_lang = ''
            else:
                if in_list:
                    html_lines.append('</ul>')
                    in_list = False
                if in_table:
                    html_lines.append(flush_table(table_headers, table_rows))
                    in_table = False
                in_code = True
                code_lang = trimmed[3:].strip().lower()
            i += 1
            continue
            
        if in_code:
            code_content.append(line)
            i += 1
            continue
            
        if trimmed.startswith('$$'):
            if trimmed.endswith('$$') and len(trimmed) > 4:
                math_expr = trimmed[2:-2].strip()
                html_lines.append(f'<div class="my-6 text-center text-sm md:text-base">$$\n{math_expr}\n$$</div>')
            else:
                math_lines = []
                i += 1
                while i < len(lines) and not lines[i].strip().startswith('$$'):
                    math_lines.append(lines[i])
                    i += 1
                math_expr = '\n'.join(math_lines).strip()
                html_lines.append(f'<div class="my-6 text-center text-sm md:text-base">$$\n{math_expr}\n$$</div>')
            i += 1
            continue

        if trimmed == '---':
            if in_list:
                html_lines.append('</ul>')
                in_list = False
            if in_table:
                html_lines.append(flush_table(table_headers, table_rows))
                in_table = False
            html_lines.append('<hr class="my-8 border-t border-slate-805" />')
            i += 1
            continue
            
        if trimmed.startswith('### '):
            if in_list:
                html_lines.append('</ul>')
                in_list = False
            if in_table:
                html_lines.append(flush_table(table_headers, table_rows))
                in_table = False
            title = parse_inline(trimmed[4:].strip())
            html_lines.append(f'<h3 class="text-xl font-bold text-slate-105 mt-5 mb-2">{title}</h3>')
            i += 1
            continue
            
        if trimmed.startswith('## '):
            if in_list:
                html_lines.append('</ul>')
                in_list = False
            if in_table:
                html_lines.append(flush_table(table_headers, table_rows))
                in_table = False
            title = parse_inline(trimmed[3:].strip())
            html_lines.append(f'<h2 class="text-2xl font-bold text-slate-105 border-b border-slate-805 pb-1.5 mt-6 mb-3 tracking-tight">{title}</h2>')
            i += 1
            continue
            
        if trimmed.startswith('* ') or trimmed.startswith('- '):
            if not in_list:
                if in_table:
                    html_lines.append(flush_table(table_headers, table_rows))
                    in_table = False
                html_lines.append('<ul class="list-disc pl-5 my-4 space-y-2">')
                in_list = True
            item_text = parse_inline(trimmed[2:].strip())
            html_lines.append(f'<li class="text-slate-250 text-sm md:text-base leading-relaxed">{item_text}</li>')
            i += 1
            continue
            
        if trimmed.startswith('|'):
            if not in_table:
                if in_list:
                    html_lines.append('</ul>')
                    in_list = False
                in_table = True
                table_headers = [c.strip() for c in trimmed.split('|')[1:-1]]
                table_rows = []
                i += 2
                continue
            else:
                row_cols = [c.strip() for c in trimmed.split('|')[1:-1]]
                table_rows.append(row_cols)
                i += 1
                continue
                
        if not trimmed:
            if in_list:
                html_lines.append('</ul>')
                in_list = False
            if in_table:
                html_lines.append(flush_table(table_headers, table_rows))
                in_table = False
            i += 1
            continue
            
        if in_list:
            html_lines.append('</ul>')
            in_list = False
        if in_table:
            html_lines.append(flush_table(table_headers, table_rows))
            in_table = False
            
        p_text = parse_inline(trimmed)
        html_lines.append(f'<p class="my-4 text-slate-250 leading-relaxed text-sm md:text-base">{p_text}</p>')
        i += 1
        
    if in_list:
        html_lines.append('</ul>')
    if in_table:
        html_lines.append(flush_table(table_headers, table_rows))
        
    return '\n'.join(html_lines)

def run_update():
    print("====================================================")
    print("STARTING APM LESSON DESCRIPTION SYNC FROM docs/apm-theory-curriculum.md")
    print("====================================================")

    if not os.path.exists(CURRICULUM_PATH):
        print(f"Error: Curriculum file {CURRICULUM_PATH} not found.")
        sys.exit(1)

    with open(CURRICULUM_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # Split by "## Bài "
    sections = re.split(r'## Bài ', content)
    parsed_contents = {}

    for sec in sections[1:]:
        lines = sec.split('\n')
        header = lines[0].strip() # e.g. "1: Giới thiệu Môn học & Python Cơ bản"
        try:
            lesson_num = int(header.split(':')[0].strip())
            sec_content = '\n'.join(lines[1:]).strip()
            html_content = convert_markdown_to_html(sec_content)
            parsed_contents[lesson_num] = html_content
            print(f"Parsed curriculum details for Lesson {lesson_num} successfully.")
        except Exception as e:
            print(f"Error parsing section {header[:30]}: {e}")

    # Fetch lessons from database
    supabase = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)
    
    courses = supabase.select("courses", {"slug": "eq.apm"})
    if not courses:
        print("Error: Course APM not found.")
        sys.exit(1)
    apm_course_id = courses[0]["id"]
    
    modules = supabase.select("modules", {"course_id": f"eq.{apm_course_id}"})
    module_ids = [m["id"] for m in modules]
    
    lessons = []
    for m_id in module_ids:
        ls = supabase.select("lessons", {"module_id": f"eq.{m_id}"})
        lessons.extend(ls)

    # Map database lessons to parsed content using title match
    # Ordered list of lessons mapping to parsed contents 1-12
    lesson_mappings = {
        "Giới thiệu môn học & Python cơ bản": 1,
        "Làm việc với dữ liệu & Numpy/Pandas": 2,
        "Hồi quy tuyến tính (Linear Regression)": 3,
        "Hồi quy phi tuyến tính (Nonlinear Regression)": 4,
        "Giới thiệu bài toán Hồi quy nâng cao": 5,
        "Giới thiệu bài toán phân loại (Classification)": 6,
        "Tiền xử lý dữ liệu & Chuẩn bị Case Study": 7,
        "Đánh giá mô hình Phân loại (Classification)": 8,
        "Thuật toán phân cụm K-Means Clustering": 9,
        "Khai phá luật kết hợp (Association Rules)": 10,
        "Case study: Retail Marketing & Telecom": 11,
        "AI Agent": 12
    }

    updated_count = 0
    for lesson in lessons:
        title = lesson["title"].strip()
        lesson_num = lesson_mappings.get(title)
        
        if lesson_num and lesson_num in parsed_contents:
            html_content = parsed_contents[lesson_num].strip()
            print(f"Updating content for Lesson {lesson_num} (Title: '{title}')...")
            supabase.update("lessons", lesson["id"], {"content": html_content})
            updated_count += 1
        else:
            print(f"Skipping lesson: '{title}' (No matching parsed lesson).")

    print("\n====================================================")
    print(f"COMPLETED! Updated {updated_count} lesson descriptions successfully.")
    print("====================================================")

if __name__ == "__main__":
    run_update()
