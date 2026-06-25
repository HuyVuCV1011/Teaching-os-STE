import os
import sys
import json
import hashlib
import mimetypes
import re
import win32com.client
import requests

# Reconfigure stdout to use UTF-8 to support Vietnamese characters in console
sys.stdout.reconfigure(encoding='utf-8')

# Source directory containing the teaching materials
SOURCE_ROOT = r"D:\HuyVu-Workspace\02_Teaching\MindX\Tài liệu DA\Tài liệu DA (từ 10-10-2025)"

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
        'Ò':'O','Ó':'O','Ỏ':'O','Õ':'O','Ọ':'O','Ô':'O','Ồ':'O','Ố':'O','Ổ':'O','Ỗ':'O','Ộ':'O','Ơ':'O','Ờ':'O','Ớ':'O','Ở':'O','Ỡ':'O','Ợ':'O',
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

# COM Automation wrappers for Office conversions
class OfficeConverter:
    def convert_pptx_to_pdf(self, pptx_path, pdf_path):
        powerpoint = None
        try:
            powerpoint = win32com.client.Dispatch("PowerPoint.Application")
            powerpoint.DisplayAlerts = 0
            abs_pptx = os.path.abspath(pptx_path)
            abs_pdf = os.path.abspath(pdf_path)
            print(f"Converting PPTX to PDF: {os.path.basename(pptx_path)}")
            presentation = powerpoint.Presentations.Open(abs_pptx, WithWindow=False)
            presentation.SaveAs(abs_pdf, 32)
            presentation.Close()
            return True
        except Exception as e:
            print(f"Error converting presentation {pptx_path}: {e}")
            return False
        finally:
            if powerpoint:
                try:
                    powerpoint.Quit()
                except:
                    pass

    def convert_docx_to_pdf(self, docx_path, pdf_path):
        word = None
        try:
            word = win32com.client.Dispatch("Word.Application")
            word.DisplayAlerts = 0
            word.Visible = False
            abs_docx = os.path.abspath(docx_path)
            abs_pdf = os.path.abspath(pdf_path)
            print(f"Converting DOCX to PDF: {os.path.basename(docx_path)}")
            doc = word.Documents.Open(abs_docx, ConfirmConversions=False)
            doc.SaveAs(abs_pdf, FileFormat=17)
            doc.Close()
            return True
        except Exception as e:
            print(f"Error converting document {docx_path}: {e}")
            return False
        finally:
            if word:
                try:
                    word.Quit(0)
                except:
                    pass

    def cleanup(self):
        pass

# Supabase REST API wrappers using requests
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

    def select(self, table, filters=None):
        endpoint = f"{self.url}/rest/v1/{table}"
        params = {}
        if filters:
            for k, v in filters.items():
                params[k] = f"eq.{v}"
        res = requests.get(endpoint, params=params, headers=self.headers)
        if res.status_code == 200:
            return res.json()
        return []

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

    def update(self, table, record_id, data):
        endpoint = f"{self.url}/rest/v1/{table}"
        params = {"id": f"eq.{record_id}"}
        res = requests.patch(endpoint, json=data, params=params, headers=self.headers)
        if res.status_code not in (200, 204):
            print(f"Failed to update {table} ID {record_id}: Status {res.status_code}, Response: {res.text}")
            res.raise_for_status()
        return res.json() if res.content else None

    def upload_file(self, bucket, storage_path, local_filepath):
        import time
        mime_type, _ = mimetypes.guess_type(local_filepath)
        if not mime_type:
            if local_filepath.endswith('.ipynb'):
                mime_type = 'application/x-ipynb+json'
            else:
                mime_type = 'application/octet-stream'

        escaped_path = storage_path.replace("\\", "/").strip("/")
        endpoint = f"{self.url}/storage/v1/object/{bucket}/{escaped_path}"
        
        headers = self.storage_headers.copy()
        headers["Content-Type"] = mime_type
        headers["x-upsert"] = "true"
        
        file_size_mb = os.path.getsize(local_filepath) / 1024 / 1024
        print(f"Uploading {os.path.basename(local_filepath)} ({file_size_mb:.2f} MB) to storage path '{escaped_path}'...")
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                with open(local_filepath, 'rb') as f:
                    file_data = f.read()
                res = requests.post(endpoint, data=file_data, headers=headers, timeout=600)
                if res.status_code not in (200, 201):
                    print(f"Upload attempt {attempt + 1} failed: Status {res.status_code}, Response: {res.text}")
                    res.raise_for_status()
                return res.json()
            except (requests.exceptions.RequestException, Exception) as e:
                print(f"Attempt {attempt + 1} failed with error: {e}")
                if attempt < max_retries - 1:
                    time.sleep(5)
                else:
                    raise e

def register_or_update_material(supabase, lesson_id, title, material_type, storage_path, visibility, file_hash, original_filename):
    existing_mat = supabase.select_one("canonical_materials", {
        "lesson_id": lesson_id,
        "title": title
    })
    if existing_mat:
        needs_update = False
        update_data = {}
        if existing_mat.get("storage_url") != storage_path:
            update_data["storage_url"] = storage_path
            needs_update = True
        if existing_mat.get("visibility") != visibility:
            update_data["visibility"] = visibility
            needs_update = True
        if existing_mat.get("type") != material_type:
            update_data["type"] = material_type
            needs_update = True
        
        existing_meta = existing_mat.get("metadata") or {}
        if existing_meta.get("file_hash") != file_hash or existing_meta.get("original_filename") != original_filename:
            existing_meta["file_hash"] = file_hash
            existing_meta["original_filename"] = original_filename
            existing_meta["display_mode"] = "both"
            update_data["metadata"] = existing_meta
            needs_update = True
            
        if needs_update:
            print(f"Updating canonical material in DB: '{title}'...")
            supabase.update("canonical_materials", existing_mat["id"], update_data)
        else:
            print(f"Canonical material already exists and is up-to-date: '{title}'")
    else:
        print(f"Registering new canonical material in DB: '{title}' (Visibility: {visibility})")
        supabase.insert("canonical_materials", {
            "lesson_id": lesson_id,
            "title": title,
            "type": material_type,
            "storage_url": storage_path,
            "visibility": visibility,
            "metadata": {
                "file_hash": file_hash,
                "original_filename": original_filename,
                "display_mode": "both"
            }
        })

# Main processing and seeding flow
def run_process_and_seed():
    print("====================================================")
    print("STEP 1: INITIALIZING CONVERTERS AND CLIENTS")
    print("====================================================")
    converter = OfficeConverter()
    supabase = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)

    try:
        # Pre-seed: Create Subject and Course
        # Let's check if the Subject "Data Analytics" exists
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
            print(f"Subject '{subject_title}' already exists (ID: {subject['id']})")

        # Let's check if Course "APM" exists
        course_title = "APM"
        course_slug = "apm"
        course = supabase.select_one("courses", {"slug": course_slug})
        if not course:
            print("Creating Course: APM...")
            course = supabase.insert("courses", {
                "title": course_title,
                "slug": course_slug,
                "subject_id": subject["id"],
                "status": "published",
                "version": 1
            })[0]
        else:
            print(f"Course '{course_title}' already exists (ID: {course['id']})")

        # Define Modules mapping (Matched exactly with database structures)
        modules_def = [
            {"title": "Cơ sở phân tích dữ liệu & Python", "order": 1},
            {"title": "Các thuật toán supervised learning", "order": 2},
            {"title": "Các thuật toán unsupervised learning", "order": 3},
            {"title": "AI Agent", "order": 4}
        ]
        
        modules = {}
        for m_def in modules_def:
            m_db = supabase.select_one("modules", {"course_id": course["id"], "title": m_def["title"]})
            if not m_db:
                print(f"Creating Module: {m_def['title']}...")
                m_db = supabase.insert("modules", {
                    "course_id": course["id"],
                    "title": m_def["title"],
                    "order_index": m_def["order"]
                })[0]
            modules[m_def["order"]] = m_db

        print("\n====================================================")
        print("STEP 2: SCANNING AND CONVERTING LOCAL FILES")
        print("====================================================")

        # 12 Lessons mapping
        lessons = {}
        
        # Helper to map Lesson number to Module ID based on database structure
        def get_module_for_lesson(n):
            if n in (1, 2):
                return modules[1]["id"]
            elif n in (3, 4, 5, 6, 7, 8):
                return modules[2]["id"]
            elif n in (9, 10, 11):
                return modules[3]["id"]
            elif n in (12, 13):
                return modules[4]["id"]
            return modules[4]["id"]

        # Define Lesson titles mapping (Matched exactly with database structures)
        lesson_titles = {
            1: "Giới thiệu môn học & Python cơ bản",
            2: "Làm việc với dữ liệu & Numpy/Pandas",
            3: "Hồi quy tuyến tính (Linear Regression)",
            4: "Hồi quy phi tuyến tính (Nonlinear Regression)",
            5: "Giới thiệu bài toán Hồi quy nâng cao",
            6: "Giới thiệu bài toán phân loại (Classification)",
            7: "Tiền xử lý dữ liệu & Chuẩn bị Case Study",
            8: "Đánh giá mô hình Phân loại (Classification)",
            9: "Thuật toán phân cụm K-Means Clustering",
            10: "Khai phá luật kết hợp (Association Rules)",
            11: "Case study: Retail Marketing & Telecom",
            12: "AI Agent",
            13: "Đồ án & Đánh giá cuối khóa"
        }

        # Fetch existing lessons for this course to match in memory (avoiding NFC/NFD mismatch)
        import unicodedata
        def normalize_text(t):
            return unicodedata.normalize('NFC', str(t)).strip().lower()

        # Fetch all lessons under the course modules
        existing_lessons = []
        for m_id in [m["id"] for m in modules.values()]:
            ls = supabase.select("lessons", {"module_id": m_id})
            existing_lessons.extend(ls)

        def find_existing_lesson(m_id, title):
            norm_title = normalize_text(title)
            for l in existing_lessons:
                if l["module_id"] == m_id and normalize_text(l["title"]) == norm_title:
                    return l
            return None

        # Create Lesson records in Database
        def get_module_order_for_lesson(n):
            mapping = {
                1: 1, 2: 2,                  # Module 1
                3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, # Module 2
                9: 1, 10: 2, 11: 3,          # Module 3
                12: 1, 13: 2                 # Module 4
            }
            return mapping.get(n, n)

        for n in range(1, 14):
            l_title = lesson_titles[n]
            m_id = get_module_for_lesson(n)
            
            l_db = find_existing_lesson(m_id, l_title)
            if not l_db:
                print(f"Creating Lesson {n}: {l_title}...")
                l_db = supabase.insert("lessons", {
                    "module_id": m_id,
                    "title": l_title,
                    "order_index": get_module_order_for_lesson(n),
                    "content": f"<h3>Giới thiệu nội dung buổi {n}</h3><p>Đây là tài liệu lý thuyết, slide bài giảng và các bài tập thực hành dành cho buổi học số {n}. Vui lòng đọc kỹ các học liệu đính kèm bên dưới và tham gia thực hành đầy đủ.</p>",
                    "download_allowed": True,
                    "grid_layout": "1-col"
                })[0]
                existing_lessons.append(l_db)
            lessons[n] = l_db

        # Now let's loop through Lesson directories in 01. Tài liệu lý thuyết
        theory_root = os.path.join(SOURCE_ROOT, "01. Tài liệu lý thuyết")
        for lesson_folder in sorted(os.listdir(theory_root)):
            if not lesson_folder.lower().startswith("lesson "):
                continue
            
            try:
                n_str = lesson_folder.split(" ")[1]
                lesson_num = int(n_str)
            except ValueError:
                continue

            if lesson_num not in lessons:
                continue

            lesson_db_id = lessons[lesson_num]["id"]
            lesson_path = os.path.join(theory_root, lesson_folder)
            
            print(f"\n--- Processing theory folder: {lesson_folder} (Lesson {lesson_num}) ---")
            
            for filename in os.listdir(lesson_path):
                filepath = os.path.join(lesson_path, filename)
                if os.path.isdir(filepath):
                    continue

                lower_name = filename.lower()
                upload_filepath = filepath
                material_type = ""
                visibility = "student"
                title = filename

                # Check file type and determine conversion
                if lower_name.endswith(".pptx"):
                    pdf_filename = filename.replace(".pptx", ".pdf")
                    pdf_filepath = os.path.join(lesson_path, pdf_filename)
                    
                    need_conversion = True
                    if os.path.exists(pdf_filepath):
                        if os.path.getmtime(pdf_filepath) >= os.path.getmtime(filepath):
                            need_conversion = False
                    
                    if need_conversion:
                        if converter.convert_pptx_to_pdf(filepath, pdf_filepath):
                            upload_filepath = pdf_filepath
                            material_type = "pdf"
                            title = filename.replace(".pptx", " (Slides)")
                        else:
                            print(f"Skipping conversion for {filename}")
                            continue
                    else:
                        print(f"PDF already exists for {filename}. Skipping conversion.")
                        upload_filepath = pdf_filepath
                        material_type = "pdf"
                        title = filename.replace(".pptx", " (Slides)")
                        
                    # Visibility check
                    if "teacher" in lower_name:
                        visibility = "teacher"
                    else:
                        visibility = "both"

                elif lower_name.endswith(".docx"):
                    pdf_filename = filename.replace(".docx", ".pdf")
                    pdf_filepath = os.path.join(lesson_path, pdf_filename)
                    
                    need_conversion = True
                    if os.path.exists(pdf_filepath):
                        if os.path.getmtime(pdf_filepath) >= os.path.getmtime(filepath):
                            need_conversion = False
                            
                    if need_conversion:
                        if converter.convert_docx_to_pdf(filepath, pdf_filepath):
                            upload_filepath = pdf_filepath
                            material_type = "pdf"
                            title = filename.replace(".docx", "")
                        else:
                            print(f"Skipping conversion for {filename}")
                            continue
                    else:
                        print(f"PDF already exists for {filename}. Skipping conversion.")
                        upload_filepath = pdf_filepath
                        material_type = "pdf"
                        title = filename.replace(".docx", "")
                    
                    if "teacher" in lower_name:
                        visibility = "teacher"
                    else:
                        visibility = "student"

                elif lower_name.endswith(".ipynb"):
                    material_type = "code_repo"
                    title = filename
                    if "teacher" in lower_name:
                        visibility = "teacher"
                    else:
                        visibility = "student"

                elif lower_name.endswith(".xlsx") or lower_name.endswith(".xls"):
                    material_type = "xlsx"
                    title = filename
                    visibility = "student"

                elif lower_name.endswith(".csv"):
                    material_type = "csv"
                    title = filename
                    visibility = "student"

                else:
                    # Ignore other files
                    continue

                # Compile storage path: courses/apm/lesson-X/filename
                file_hash = get_file_hash(upload_filepath)
                ext = os.path.splitext(upload_filepath)[1]
                storage_filename = f"{os.path.splitext(os.path.basename(upload_filepath))[0]}_{file_hash[:10]}{ext}"
                raw_path = f"courses/apm/lesson-{lesson_num}/{storage_filename}"
                storage_path = sanitize_storage_path(raw_path)

                # Upload to Supabase Storage bucket 'teaching-materials'
                supabase.upload_file("teaching-materials", storage_path, upload_filepath)

                register_or_update_material(
                    supabase=supabase,
                    lesson_id=lesson_db_id,
                    title=title,
                    material_type=material_type,
                    storage_path=storage_path,
                    visibility=visibility,
                    file_hash=file_hash,
                    original_filename=filename
                )

        # Process Practice notebooks in 02. Tài liệu thực hành
        practice_root = os.path.join(SOURCE_ROOT, "02. Tài liệu thực hành")
        print("\n--- Processing practice notebooks ---")
        for filename in sorted(os.listdir(practice_root)):
            filepath = os.path.join(practice_root, filename)
            if not filename.lower().endswith(".ipynb"):
                continue

            lower_name = filename.lower()
            lesson_num = None
            for n in range(12, 0, -1):
                if f"lesson {n}" in lower_name:
                    lesson_num = n
                    break
            
            if not lesson_num:
                print(f"Could not map practice file to lesson: {filename}")
                continue

            lesson_db_id = lessons[lesson_num]["id"]
            file_hash = get_file_hash(filepath)
            storage_filename = f"{os.path.splitext(filename)[0]}_{file_hash[:10]}.ipynb"
            raw_path = f"courses/apm/lesson-{lesson_num}/practice/{storage_filename}"
            storage_path = sanitize_storage_path(raw_path)

            # Upload notebook
            supabase.upload_file("teaching-materials", storage_path, filepath)

            # Insert into canonical_materials
            title = filename
            register_or_update_material(
                supabase=supabase,
                lesson_id=lesson_db_id,
                title=title,
                material_type="code_repo",
                storage_path=storage_path,
                visibility="student",
                file_hash=file_hash,
                original_filename=filename
            )

        # Process Lesson 13 (Final Evaluation & Project) from 03, 04, 05
        final_lesson_id = lessons[13]["id"]
        
        # 1. Final Test
        final_test_root = os.path.join(SOURCE_ROOT, "03. Final Test - Final Project", "Final test")
        for filename in os.listdir(final_test_root):
            filepath = os.path.join(final_test_root, filename)
            if filename.endswith(".docx"):
                pdf_filename = filename.replace(".docx", ".pdf")
                pdf_filepath = os.path.join(final_test_root, pdf_filename)
                
                need_conversion = True
                if os.path.exists(pdf_filepath):
                    if os.path.getmtime(pdf_filepath) >= os.path.getmtime(filepath):
                        need_conversion = False
                        
                if need_conversion:
                    if not converter.convert_docx_to_pdf(filepath, pdf_filepath):
                        print(f"Failed to convert {filename}")
                        continue
                
                file_hash = get_file_hash(pdf_filepath)
                raw_path = f"courses/apm/lesson-13/{pdf_filename.replace('.pdf', '')}_{file_hash[:10]}.pdf"
                storage_path = sanitize_storage_path(raw_path)
                supabase.upload_file("teaching-materials", storage_path, pdf_filepath)
                register_or_update_material(
                    supabase=supabase,
                    lesson_id=final_lesson_id,
                    title=filename.replace(".docx", ""),
                    material_type="pdf",
                    storage_path=storage_path,
                    visibility="student",
                    file_hash=file_hash,
                    original_filename=filename
                )

        # 2. Final Project
        final_project_root = os.path.join(SOURCE_ROOT, "03. Final Test - Final Project", "Final Project")
        for filename in os.listdir(final_project_root):
            filepath = os.path.join(final_project_root, filename)
            if filename.endswith(".docx"):
                pdf_filename = filename.replace(".docx", ".pdf")
                pdf_filepath = os.path.join(final_project_root, pdf_filename)
                
                need_conversion = True
                if os.path.exists(pdf_filepath):
                    if os.path.getmtime(pdf_filepath) >= os.path.getmtime(filepath):
                        need_conversion = False
                        
                if need_conversion:
                    if not converter.convert_docx_to_pdf(filepath, pdf_filepath):
                        print(f"Failed to convert {filename}")
                        continue
                        
                file_hash = get_file_hash(pdf_filepath)
                raw_path = f"courses/apm/lesson-13/{pdf_filename.replace('.pdf', '')}_{file_hash[:10]}.pdf"
                storage_path = sanitize_storage_path(raw_path)
                supabase.upload_file("teaching-materials", storage_path, pdf_filepath)
                register_or_update_material(
                    supabase=supabase,
                    lesson_id=final_lesson_id,
                    title=filename.replace(".docx", ""),
                    material_type="pdf",
                    storage_path=storage_path,
                    visibility="student",
                    file_hash=file_hash,
                    original_filename=filename
                )
            elif filename.endswith(".xlsx"):
                file_hash = get_file_hash(filepath)
                raw_path = f"courses/apm/lesson-13/{os.path.splitext(filename)[0]}_{file_hash[:10]}.xlsx"
                storage_path = sanitize_storage_path(raw_path)
                supabase.upload_file("teaching-materials", storage_path, filepath)
                register_or_update_material(
                    supabase=supabase,
                    lesson_id=final_lesson_id,
                    title=filename,
                    material_type="xlsx",
                    storage_path=storage_path,
                    visibility="student",
                    file_hash=file_hash,
                    original_filename=filename
                )

        # 3. Project tham khảo (Reference projects)
        ref_root = os.path.join(SOURCE_ROOT, "04. Project tham khảo")
        for filename in os.listdir(ref_root):
            filepath = os.path.join(ref_root, filename)
            if filename.endswith(".pdf"):
                file_hash = get_file_hash(filepath)
                raw_path = f"courses/apm/lesson-13/reference/{os.path.splitext(filename)[0]}_{file_hash[:10]}.pdf"
                storage_path = sanitize_storage_path(raw_path)
                supabase.upload_file("teaching-materials", storage_path, filepath)
                register_or_update_material(
                    supabase=supabase,
                    lesson_id=final_lesson_id,
                    title=f"Project tham khảo: {filename.replace('.pdf', '')}",
                    material_type="pdf",
                    storage_path=storage_path,
                    visibility="student",
                    file_hash=file_hash,
                    original_filename=filename
                )

        # 4. Bài giải mẫu Final test (Teacher only!)
        solution_root = os.path.join(SOURCE_ROOT, "05. Bài giải mẫu Final test")
        for filename in os.listdir(solution_root):
            filepath = os.path.join(solution_root, filename)
            lower_name = filename.lower()
            if lower_name.endswith(".pdf"):
                file_hash = get_file_hash(filepath)
                raw_path = f"courses/apm/lesson-13/solutions/{os.path.splitext(filename)[0]}_{file_hash[:10]}.pdf"
                storage_path = sanitize_storage_path(raw_path)
                supabase.upload_file("teaching-materials", storage_path, filepath)
                register_or_update_material(
                    supabase=supabase,
                    lesson_id=final_lesson_id,
                    title=f"Bài giải mẫu: {filename.replace('.pdf', '')}",
                    material_type="pdf",
                    storage_path=storage_path,
                    visibility="teacher",
                    file_hash=file_hash,
                    original_filename=filename
                )
            elif lower_name.endswith(".ipynb"):
                file_hash = get_file_hash(filepath)
                raw_path = f"courses/apm/lesson-13/solutions/{os.path.splitext(filename)[0]}_{file_hash[:10]}.ipynb"
                storage_path = sanitize_storage_path(raw_path)
                supabase.upload_file("teaching-materials", storage_path, filepath)
                register_or_update_material(
                    supabase=supabase,
                    lesson_id=final_lesson_id,
                    title=f"Bài giải mẫu: {filename.replace('.ipynb', '')}",
                    material_type="code_repo",
                    storage_path=storage_path,
                    visibility="teacher",
                    file_hash=file_hash,
                    original_filename=filename
                )

        print("\n====================================================")
        print("SEEDING COMPLETED SUCCESSFULLY!")
        print("====================================================")

    except Exception as err:
        print(f"\nFatal error during seeding: {err}")
    finally:
        converter.cleanup()

if __name__ == "__main__":
    run_process_and_seed()
