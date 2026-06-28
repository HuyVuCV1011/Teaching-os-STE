import os
import sys
import json
import hashlib
import mimetypes
import re
import requests

# Reconfigure stdout to support UTF-8 Vietnamese output in console
sys.stdout.reconfigure(encoding='utf-8')

# Source directory containing the teaching materials
SOURCE_ROOT = r"D:\HuyVu-Workspace\02_Teaching\Aptech\AI and ML with Python"

# Load Supabase configuration from .env.local
def load_env_local():
    env = {}
    if not os.path.exists(".env.local"):
        print("Error: .env.local not found in the workspace root.")
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
    print("Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.local.")
    sys.exit(1)

# Helper function to compute file SHA-256 hash
def get_file_hash(filepath):
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while True:
            data = f.read(65536)
            if not data:
                break
            sha256.update(data)
    return sha256.hexdigest()

# Helper function to sanitize storage path (removing Vietnamese diacritics and spaces)
def sanitize_storage_path(path):
    parts = path.split('/')
    sanitized_parts = []
    
    vietnamese_map = {
        'à':'a','á':'a','ả':'a','ã':'a','ạ':'a','ă':'a','ằ':'a','ắ':'a','ẳ':'a','ẵ':'a','ặ':'a','â':'a','ầ':'a','ấ':'a','ẩ':'a','ẫ':'a','ậ':'a',
        'đ':'d',
        'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e','ê':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e',
        'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
        'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o','ô':'o','ồ':'o','ố':'o','ổ':'o','ỗ':'o','ộ':'o','ơ':'o','ờ':'o','ớ':'o','ở':'o','ỡ':'o','ợ':'o',
        'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u','ư':'u','ừ':'u','ứ':'u','ử':'u','ự':'u',
        'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y',
        'À':'A','Á':'A','Ả':'A','Ã':'A','Ạ':'A','Ă':'A','Ằ':'A','Ắ':'A','Ẳ':'A','Ẵ':'A','Ặ':'A','Â':'A','Ầ':'A','Ấ':'A','Ẩ':'A','Ẫ':'A','Ậ':'A',
        'Đ':'D',
        'È':'E','É':'E','Ẻ':'E','Ẽ':'E','Ẹ':'E','Ê':'E','Ề':'E','Ế':'E','Ể':'E','Ễ':'E','Ệ':'E',
        'Ì':'I','Í':'I','Ỉ':'I','Ĩ':'I','Ị':'I',
        'Ò':'O','Ó':'O','Ỏ':'O','Õ':'O','Ọ':'O','Ô':'O','Ồ':'O','Ố':'O','Ổ':'O','Ộ':'O','Ơ':'O','Ờ':'O','Ớ':'O','Ở':'O','Ỡ':'O','Ợ':'O',
        'Ù':'U','Ú':'U','Ủ':'U','Ũ':'U','Ụ':'U','Ư':'U','Ừ':'U','Ứ':'U','Ử':'U','Ữ':'U','Ự':'U',
        'Ỳ':'Y','Ý':'Y','Ỷ':'Y','Ỹ':'Y','Ỵ':'Y'
    }
    
    for part in parts:
        for k, v in vietnamese_map.items():
            part = part.replace(k, v)
        # Replace non-alphanumeric (except dots, dashes, underscores)
        part = re.sub(r'[^a-zA-Z0-9._-]', '-', part)
        part = re.sub(r'-+', '-', part).strip('-')
        sanitized_parts.append(part)
        
    return '/'.join(sanitized_parts)

# Simple Markdown to HTML parser for Giao An overview and homework instructions
def markdown_to_html(md_content):
    # Find section ## I. TỔNG QUAN BÀI HỌC (LESSON OVERVIEW)
    match = re.search(r'(## I\..*?)(## II\.)', md_content, re.DOTALL | re.IGNORECASE)
    if not match:
        # Fallback to entire content or first 2000 chars if not standard
        section = md_content[:2000]
    else:
        section = match.group(1)
        
    html = section
    # Convert headers
    html = re.sub(r'^# (.*)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.*)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.*)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    
    # Convert bold & italic
    html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'\*(.*?)\*', r'<em>\1</em>', html)
    
    # Convert list items
    html = re.sub(r'^\s*[\*\-]\s+(.*)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    html = re.sub(r'^\s*\d+\.\s+(.*)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    
    # Simple list wrapping
    lines = html.split('\n')
    in_list = False
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('<li>') and not in_list:
            new_lines.append('<ul>')
            in_list = True
            new_lines.append(line)
        elif not stripped.startswith('<li>') and in_list:
            new_lines.append('</ul>')
            in_list = False
            new_lines.append(line)
        else:
            new_lines.append(line)
    if in_list:
        new_lines.append('</ul>')
        
    html = '\n'.join(new_lines)
    
    # Wrap in paragraphs
    html = re.sub(r'\n\n+', r'</p><p>', html)
    html = f"<p>{html}</p>"
    
    # Clean empty tags
    html = html.replace('<p></p>', '')
    html = html.replace('<p><ul>', '<ul>').replace('</ul></p>', '</ul>')
    html = html.replace('<p><h2>', '<h2>').replace('</h2></p>', '</h2>')
    html = html.replace('<p><h3>', '<h3>').replace('</h3></p>', '</h3>')
    
    return html

# Supabase REST API wrappers
class SupabaseClient:
    def __init__(self, url, service_key):
        self.url = url
        self.headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        self.storage_headers = {
            "Authorization": f"Bearer {service_key}"
        }

    def insert(self, table, data):
        endpoint = f"{self.url}/rest/v1/{table}"
        payload = data if isinstance(data, list) else [data]
        res = requests.post(endpoint, json=payload, headers=self.headers)
        if res.status_code not in (200, 201):
            print(f"Failed to insert into {table}: Status {res.status_code}, Response: {res.text}")
            res.raise_for_status()
        return res.json()

    def select_one(self, table, filters=None):
        endpoint = f"{self.url}/rest/v1/{table}"
        params = {"limit": 1}
        if filters:
            for k, v in filters.items():
                params[k] = f"eq.{v}"
        res = requests.get(endpoint, params=params, headers=self.headers)
        if res.status_code == 200:
            data = res.json()
            return data[0] if data else None
        return None

    def delete(self, table, filters=None):
        endpoint = f"{self.url}/rest/v1/{table}"
        params = {}
        if filters:
            for k, v in filters.items():
                params[k] = f"eq.{v}"
        res = requests.delete(endpoint, params=params, headers=self.headers)
        if res.status_code not in (200, 204):
            print(f"Failed to delete from {table}: Status {res.status_code}, Response: {res.text}")
            res.raise_for_status()
        return True

    def upload_file(self, bucket, storage_path, local_filepath):
        mime_type, _ = mimetypes.guess_type(local_filepath)
        if not mime_type:
            if local_filepath.endswith('.ipynb'):
                mime_type = 'application/x-ipynb+json'
            elif local_filepath.endswith('.md'):
                mime_type = 'text/markdown'
            else:
                mime_type = 'application/octet-stream'

        escaped_path = storage_path.replace("\\", "/").strip("/")
        endpoint = f"{self.url}/storage/v1/object/{bucket}/{escaped_path}"
        
        headers = self.storage_headers.copy()
        headers["Content-Type"] = mime_type
        headers["x-upsert"] = "true"
        
        print(f"Uploading file to '{bucket}/{escaped_path}'...")
        with open(local_filepath, 'rb') as f:
            file_data = f.read()

        res = requests.post(endpoint, data=file_data, headers=headers)
        if res.status_code not in (200, 201):
            print(f"Failed to upload file to {bucket}: Status {res.status_code}, Response: {res.text}")
            res.raise_for_status()
        return res.json()

def run_process_and_seed():
    print("====================================================")
    print("STEP 1: INITIALIZING CLIENTS")
    print("====================================================")
    supabase = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)

    try:
        # 1. Fetch Subject "Data Analytics"
        subject_title = "Data Analytics"
        subject = supabase.select_one("subjects", {"name": subject_title})
        if not subject:
            print("Creating Subject: Data Analytics...")
            subject = supabase.insert("subjects", {
                "name": subject_title,
                "slug": "data-analytics",
                "description": "Chuyên ngành phân tích dữ liệu ứng dụng"
            })[0]
        else:
            print(f"Subject '{subject_title}' exists with ID: {subject['id']}")

        # 2. Re-create Course "AI and ML with Python" (Slug: ai-ml-python)
        course_title = "AI and ML with Python"
        course_slug = "ai-ml-python"
        
        # Check and delete existing course to cascade reset
        existing_course = supabase.select_one("courses", {"slug": course_slug})
        if existing_course:
            print(f"Found existing course with slug '{course_slug}'. Resetting for clean seed...")
            supabase.delete("courses", {"id": existing_course["id"]})
            print("Reset complete.")

        print("Creating Course: AI and ML with Python...")
        course = supabase.insert("courses", {
            "title": course_title,
            "slug": course_slug,
            "subject_id": subject["id"],
            "status": "published",
            "version": 1
        })[0]
        print(f"Created Course ID: {course['id']}")

        # 3. Create Modules
        modules_def = [
            {"title": "Hệ thống gợi ý nâng cao", "order": 1},
            {"title": "Mạng Bayesian & Phát hiện bất thường", "order": 2},
            {"title": "Học máy lượng tử & Meta-learning", "order": 3},
            {"title": "Đạo đức AI & Đồ án tốt nghiệp", "order": 4}
        ]
        
        modules = {}
        for m_def in modules_def:
            print(f"Creating Module: {m_def['title']}...")
            m_db = supabase.insert("modules", {
                "course_id": course["id"],
                "title": m_def["title"],
                "order_index": m_def["order"]
            })[0]
            modules[m_def["order"]] = m_db

        # 4. Map folder names to module indices and order indices
        lesson_folders = [
            ("Lesson 01", 1, 1, "Giới thiệu AI/ML & Python Cơ bản"),
            ("Lesson 02", 1, 2, "Hệ gợi ý nâng cao (Advanced Recommender Systems)"),
            ("Lesson 02.5", 1, 3, "Thực hành xây dựng hệ gợi ý (Practice Recommender Systems)"),
            ("Lesson 03", 2, 4, "Mạng Bayesian (Bayesian Networks)"),
            ("Lesson 03.5", 2, 5, "Thực hành Mạng Bayesian (Practice Bayesian Networks)"),
            ("Lesson 04", 2, 6, "Phát hiện bất thường (Anomaly Detection)"),
            ("Lesson 05", 3, 7, "Học máy lượng tử (Quantum Machine Learning)"),
            ("Lesson 05.5", 3, 8, "Thực hành QML (Practice Quantum Machine Learning)"),
            ("Lesson 06", 3, 9, "Meta-Learning & Adaptive Learning Agents"),
            ("Lesson 07", 4, 10, "Đạo đức AI, Quyền riêng tư & Sai lệch (AI Ethics, Privacy & Bias)"),
            ("Lesson 08", 4, 11, "Báo cáo đồ án tốt nghiệp (Capstone Project Presentation)"),
            ("Lesson 08.5", 4, 12, "Thực hành Capstone Project & Edge Deployment")
        ]

        print("\n====================================================")
        print("STEP 2: SCANNING AND SEEDING LESSONS & MATERIALS")
        print("====================================================")
        
        lessons = {}
        for folder_name, m_idx, db_order, default_title in lesson_folders:
            lesson_path = os.path.join(SOURCE_ROOT, folder_name)
            if not os.path.exists(lesson_path):
                print(f"[!] Warning: Folder {folder_name} not found! Skipping.")
                continue

            print(f"\n--- Processing folder: {folder_name} (Lesson Order {db_order}) ---")
            
            # Read lesson overview from Giao an if it exists
            content_html = ""
            giao_an_file = f"Giao an - {folder_name}.md"
            giao_an_path = os.path.join(lesson_path, giao_an_file)
            
            if os.path.exists(giao_an_path):
                with open(giao_an_path, "r", encoding="utf-8") as f:
                    md_text = f.read()
                content_html = markdown_to_html(md_text)
            
            if not content_html:
                content_html = f"<h3>Giới thiệu nội dung buổi {folder_name.replace('Lesson ', '')}</h3><p>Đây là các học liệu lý thuyết, slide bài giảng, code thực hành và bài tập củng cố dành cho buổi học: {default_title}. Vui lòng xem kỹ tài liệu đính kèm bên dưới.</p>"

            # Create lesson in DB
            print(f"Creating Lesson {db_order}: '{default_title}'...")
            lesson_db = supabase.insert("lessons", {
                "module_id": modules[m_idx]["id"],
                "title": default_title,
                "order_index": db_order,
                "content": content_html,
                "download_allowed": True,
                "grid_layout": "1-col"
            })[0]
            lessons[db_order] = lesson_db

            # 4. Upload standard materials in the root of the lesson directory
            for filename in os.listdir(lesson_path):
                filepath = os.path.join(lesson_path, filename)
                if os.path.isdir(filepath):
                    continue

                lower_name = filename.lower()
                material_type = ""
                visibility = "both"
                title = filename

                # Determine material properties
                if lower_name.endswith(".pdf"):
                    material_type = "pdf"
                    if "huong dan thuyet trinh slide" in lower_name:
                        visibility = "teacher"
                        title = filename.replace(".pdf", "")
                    elif "slide thuyet trinh" in lower_name:
                        visibility = "both"
                        title = filename.replace(".pdf", " (Slides)")
                    elif "ebook" in lower_name:
                        visibility = "student"
                        title = filename.replace(".pdf", " (Ebook)")
                    else:
                        visibility = "both"
                elif lower_name.endswith(".md"):
                    # This is the detailed lesson plan MD or other guides
                    material_type = "link"
                    visibility = "teacher"
                    title = filename.replace(".md", "")
                else:
                    # Ignore other files
                    continue

                # Compile storage path
                file_hash = get_file_hash(filepath)
                ext = os.path.splitext(filepath)[1]
                storage_filename = f"{os.path.splitext(filename)[0]}_{file_hash[:10]}{ext}"
                raw_path = f"courses/ai-ml-python/lesson-{db_order}/{storage_filename}"
                storage_path = sanitize_storage_path(raw_path)

                # Upload to Supabase storage bucket 'teaching-materials'
                supabase.upload_file("teaching-materials", storage_path, filepath)

                # Register in database
                print(f"Registering material: {title} (Visibility: {visibility}, Type: {material_type})")
                supabase.insert("canonical_materials", {
                    "lesson_id": lesson_db["id"],
                    "title": title,
                    "type": material_type,
                    "storage_url": storage_path,
                    "visibility": visibility,
                    "metadata": {
                        "file_hash": file_hash,
                        "original_filename": filename,
                        "display_mode": "both"
                    }
                })

            # 5. Process In-class Practice folder
            practice_path = os.path.join(lesson_path, "Thuc hanh tren lop")
            if os.path.exists(practice_path):
                print(f"Processing in-class practice...")
                for filename in os.listdir(practice_path):
                    filepath = os.path.join(practice_path, filename)
                    if os.path.isdir(filepath):
                        # Recursive helper to upload subdirectories
                        def upload_recursive(current_dir, sub_rel_path=""):
                            for sub_file in os.listdir(current_dir):
                                sub_path = os.path.join(current_dir, sub_file)
                                if os.path.isdir(sub_path):
                                    upload_recursive(sub_path, sub_rel_path + sub_file + "/")
                                else:
                                    sub_hash = get_file_hash(sub_path)
                                    sub_ext = os.path.splitext(sub_file)[1]
                                    sub_storage_name = f"{os.path.splitext(sub_file)[0]}_{sub_hash[:10]}{sub_ext}"
                                    sub_storage_path = sanitize_storage_path(f"courses/ai-ml-python/lesson-{db_order}/practice/{sub_rel_path}{sub_storage_name}")
                                    
                                    # Upload dataset/subfile
                                    supabase.upload_file("teaching-materials", sub_storage_path, sub_path)
                                    
                                    # Register in canonical materials
                                    print(f"Registering practice dataset file: {sub_file}")
                                    supabase.insert("canonical_materials", {
                                        "lesson_id": lesson_db["id"],
                                        "title": f"Dataset: {sub_file}",
                                        "type": "link",
                                        "storage_url": sub_storage_path,
                                        "visibility": "student",
                                        "metadata": {"file_hash": sub_hash}
                                    })
                        upload_recursive(filepath, filename + "/")
                        continue

                    lower_name = filename.lower()
                    material_type = ""
                    visibility = "student"
                    
                    if lower_name.endswith(".ipynb"):
                        material_type = "code_repo"
                        title = f"Thực hành: {filename}"
                    elif lower_name.endswith(".csv") or lower_name.endswith(".xlsx"):
                        material_type = "link"
                        title = f"Dataset: {filename}"
                    else:
                        continue
                    
                    file_hash = get_file_hash(filepath)
                    ext = os.path.splitext(filepath)[1]
                    storage_filename = f"{os.path.splitext(filename)[0]}_{file_hash[:10]}{ext}"
                    raw_path = f"courses/ai-ml-python/lesson-{db_order}/practice/{storage_filename}"
                    storage_path = sanitize_storage_path(raw_path)

                    supabase.upload_file("teaching-materials", storage_path, filepath)

                    print(f"Registering practice material: {title}")
                    supabase.insert("canonical_materials", {
                        "lesson_id": lesson_db["id"],
                        "title": title,
                        "type": material_type,
                        "storage_url": storage_path,
                        "visibility": visibility,
                        "metadata": {
                            "file_hash": file_hash,
                            "original_filename": filename,
                            "display_mode": "both"
                        }
                    })

            # 6. Process Homework folder
            hw_path = os.path.join(lesson_path, "Bai tap ve nha")
            if os.path.exists(hw_path):
                print(f"Processing homework deliverables and solutions...")
                
                de_bai_path = os.path.join(hw_path, "De_bai.md")
                de_bai_storage_path = None
                de_bai_hash = None
                de_bai_size = 0
                
                if os.path.exists(de_bai_path):
                    de_bai_hash = get_file_hash(de_bai_path)
                    de_bai_size = os.path.getsize(de_bai_path)
                    de_bai_storage_path = sanitize_storage_path(f"courses/ai-ml-python/lesson-{db_order}/homework/De_bai_{de_bai_hash[:10]}.md")
                    supabase.upload_file("teaching-materials", de_bai_storage_path, de_bai_path)
                
                data_files = []
                for filename in os.listdir(hw_path):
                    filepath = os.path.join(hw_path, filename)
                    if os.path.isdir(filepath):
                        continue
                    lower_name = filename.lower()
                    if lower_name.endswith(".csv") or lower_name.endswith(".xlsx"):
                        f_hash = get_file_hash(filepath)
                        f_size = os.path.getsize(filepath)
                        f_ext = os.path.splitext(filepath)[1]
                        f_storage_name = f"{os.path.splitext(filename)[0]}_{f_hash[:10]}{f_ext}"
                        f_storage_path = sanitize_storage_path(f"courses/ai-ml-python/lesson-{db_order}/homework/{f_storage_name}")
                        
                        supabase.upload_file("teaching-materials", f_storage_path, filepath)
                        
                        print(f"Registering homework dataset material: {filename}")
                        supabase.insert("canonical_materials", {
                            "lesson_id": lesson_db["id"],
                            "title": f"Bài tập - Dataset: {filename}",
                            "type": "link",
                            "storage_url": f_storage_path,
                            "visibility": "student",
                            "metadata": {"file_hash": f_hash}
                        })
                        
                        data_files.append({
                            "name": filename,
                            "size": f_size,
                            "storage_path": f_storage_path,
                            "downloadable": True,
                            "previewable": True
                        })

                solved_nb = [f for f in os.listdir(hw_path) if "giai" in f.lower() and f.endswith(".ipynb")]
                solution_path_in_bucket = None
                
                if solved_nb:
                    solved_filename = solved_nb[0]
                    solved_filepath = os.path.join(hw_path, solved_filename)
                    solved_hash = get_file_hash(solved_filepath)
                    solution_path_in_bucket = sanitize_storage_path(f"solutions/ai-ml-python/lesson-{db_order}/{os.path.splitext(solved_filename)[0]}_{solved_hash[:10]}.ipynb")
                    
                    supabase.upload_file("assignment-solutions", solution_path_in_bucket, solved_filepath)
                    print(f"Uploaded solution file to private bucket: {solution_path_in_bucket}")

                reference_files = []
                if de_bai_storage_path:
                    reference_files.append({
                        "name": "De_bai.md",
                        "size": de_bai_size,
                        "storage_path": de_bai_storage_path,
                        "downloadable": True,
                        "previewable": True
                    })

                instructions_payload = {
                    "questions": [],
                    "data_files": data_files,
                    "reference_files": reference_files,
                    "mcqWeightPercent": 0,
                    "essayWeightPercent": 100
                }

                print(f"Registering Assignment for Lesson {db_order}...")
                supabase.insert("assignments", {
                    "lesson_id": lesson_db["id"],
                    "title": f"Bài tập về nhà - {default_title}",
                    "instructions": json.dumps(instructions_payload),
                    "max_score": 100,
                    "max_files": 3,
                    "max_total_size_mb": 50,
                    "solution_storage_path": solution_path_in_bucket,
                    "prompt_file_path": de_bai_storage_path,
                    "ai_model_used": "groq/llama-3.3-70b-versatile"
                })

        print("\n====================================================")
        print("SEEDING COMPLETED SUCCESSFULLY!")
        print("====================================================")

    except Exception as err:
        print(f"\nFatal error during seeding: {err}")

if __name__ == "__main__":
    run_process_and_seed()
