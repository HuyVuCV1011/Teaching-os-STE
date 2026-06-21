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
SOURCE_ROOT = r"D:\HuyVu-Workspace\02_Teaching\drive-download-20260620T191028Z-3-001\Tài liệu DA\Tài liệu DA (từ 10-10-2025)"

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
    def __init__(self):
        self.powerpoint = None
        self.word = None

    def convert_pptx_to_pdf(self, pptx_path, pdf_path):
        if not self.powerpoint:
            try:
                self.powerpoint = win32com.client.Dispatch("PowerPoint.Application")
            except Exception as e:
                print(f"Failed to start PowerPoint: {e}")
                return False
        try:
            abs_pptx = os.path.abspath(pptx_path)
            abs_pdf = os.path.abspath(pdf_path)
            print(f"Converting PPTX to PDF: {os.path.basename(pptx_path)}")
            # WithWindow=False runs PowerPoint presentation in the background
            presentation = self.powerpoint.Presentations.Open(abs_pptx, WithWindow=False)
            presentation.SaveAs(abs_pdf, 32) # 32 is PDF format
            presentation.Close()
            return True
        except Exception as e:
            print(f"Error converting presentation {pptx_path}: {e}")
            return False

    def convert_docx_to_pdf(self, docx_path, pdf_path):
        if not self.word:
            try:
                self.word = win32com.client.Dispatch("Word.Application")
                self.word.Visible = False
            except Exception as e:
                print(f"Failed to start Word: {e}")
                return False
        try:
            abs_docx = os.path.abspath(docx_path)
            abs_pdf = os.path.abspath(pdf_path)
            print(f"Converting DOCX to PDF: {os.path.basename(docx_path)}")
            doc = self.word.Documents.Open(abs_docx)
            doc.SaveAs(abs_pdf, FileFormat=17) # 17 is PDF format
            doc.Close()
            return True
        except Exception as e:
            print(f"Error converting document {docx_path}: {e}")
            return False

    def cleanup(self):
        if self.powerpoint:
            try:
                self.powerpoint.Quit()
            except:
                pass
        if self.word:
            try:
                self.word.Quit(0) # 0 = wdDoNotSaveChanges
            except:
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
        # If input is a single dict, put it inside a list
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

    def upload_file(self, bucket, storage_path, local_filepath):
        # Determine mime type
        mime_type, _ = mimetypes.guess_type(local_filepath)
        if not mime_type:
            if local_filepath.endswith('.ipynb'):
                mime_type = 'application/x-ipynb+json'
            else:
                mime_type = 'application/octet-stream'

        # Upload file to Supabase Storage bucket
        # Endpoint: POST /storage/v1/object/{bucket}/{path}
        # To overwrite, we use the upsert header: x-upsert: true
        # URL needs to be properly escaped
        escaped_path = storage_path.replace("\\", "/").strip("/")
        endpoint = f"{self.url}/storage/v1/object/{bucket}/{escaped_path}"
        
        headers = self.storage_headers.copy()
        headers["Content-Type"] = mime_type
        headers["x-upsert"] = "true"
        
        print(f"Uploading {os.path.basename(local_filepath)} to storage path '{escaped_path}'...")
        with open(local_filepath, 'rb') as f:
            file_data = f.read()

        res = requests.post(endpoint, data=file_data, headers=headers)
        if res.status_code not in (200, 201):
            print(f"Failed to upload {local_filepath}: Status {res.status_code}, Response: {res.text}")
            res.raise_for_status()
        return res.json()

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

        # Define Modules mapping
        modules_def = [
            {"title": "Cơ sở phân tích dữ liệu & Python", "order": 1},
            {"title": "Mô hình hồi quy & Thuật toán", "order": 2},
            {"title": "Phân nhóm & Thuật toán phân lớp", "order": 3},
            {"title": "Khai phá luật kết hợp & Case study", "order": 4},
            {"title": "Đánh giá & Dự án cuối khóa", "order": 5}
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
        
        # Helper to map Lesson number to Module ID
        def get_module_for_lesson(n):
            if n in (1, 2, 3):
                return modules[1]["id"]
            elif n in (4, 5):
                return modules[2]["id"] # Linear and nonlinear regression
            elif n in (6, 7, 8, 9):
                return modules[3]["id"] # Classification algorithms
            elif n in (10, 11, 12):
                return modules[4]["id"] # Association rules and case studies
            return modules[4]["id"]

        # Define Lesson titles mapping
        lesson_titles = {
            1: "Giới thiệu môn học & Python cơ bản",
            2: "Làm việc với dữ liệu & Numpy/Pandas",
            3: "Hồi quy tuyến tính (Linear Regression)",
            4: "Hồi quy phi tuyến tính (Nonlinear Regression)",
            5: "Giới thiệu bài toán Hồi quy nâng cao",
            6: "Giới thiệu bài toán phân loại (Classification)",
            7: "Tiền xử lý dữ liệu & Chuẩn bị Case Study",
            8: "Đánh giá mô hình Phân loại",
            9: "Thuật toán phân cụm K-Means Clustering",
            10: "Khai phá luật kết hợp (Association Rules)",
            11: "Case study: Retail Marketing & Telecom",
            12: "Tổng kết học phần & Đánh giá bài giảng",
            13: "Đồ án & Đánh giá cuối khóa"
        }

        # Create Lesson records in Database
        for n in range(1, 14):
            l_title = lesson_titles[n]
            m_id = get_module_for_lesson(n) if n <= 12 else modules[5]["id"]
            
            l_db = supabase.select_one("lessons", {"module_id": m_id, "title": l_title})
            if not l_db:
                print(f"Creating Lesson {n}: {l_title}...")
                l_db = supabase.insert("lessons", {
                    "module_id": m_id,
                    "title": l_title,
                    "order_index": n,
                    "content": f"<h3>Giới thiệu nội dung buổi {n}</h3><p>Đây là tài liệu lý thuyết, slide bài giảng và các bài tập thực hành dành cho buổi học số {n}. Vui lòng đọc kỹ các học liệu đính kèm bên dưới và tham gia thực hành đầy đủ.</p>",
                    "download_allowed": True,
                    "grid_layout": "1-col"
                })[0]
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
                    # Convert to PDF
                    if converter.convert_pptx_to_pdf(filepath, pdf_filepath):
                        upload_filepath = pdf_filepath
                        material_type = "pdf"
                        title = filename.replace(".pptx", " (Slides)")
                    else:
                        print(f"Skipping conversion for {filename}")
                        continue
                    # Visibility check
                    if "teacher" in lower_name:
                        visibility = "teacher"
                    else:
                        visibility = "both"

                elif lower_name.endswith(".docx"):
                    pdf_filename = filename.replace(".docx", ".pdf")
                    pdf_filepath = os.path.join(lesson_path, pdf_filename)
                    # Convert to PDF
                    if converter.convert_docx_to_pdf(filepath, pdf_filepath):
                        upload_filepath = pdf_filepath
                        material_type = "pdf"
                        title = filename.replace(".docx", "")
                    else:
                        print(f"Skipping conversion for {filename}")
                        continue
                    
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

                # Insert into canonical_materials in DB
                print(f"Registering canonical material in DB: {title} (Visibility: {visibility})")
                supabase.insert("canonical_materials", {
                    "lesson_id": lesson_db_id,
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

        # Process Practice notebooks in 02. Tài liệu thực hành
        practice_root = os.path.join(SOURCE_ROOT, "02. Tài liệu thực hành")
        print("\n--- Processing practice notebooks ---")
        for filename in sorted(os.listdir(practice_root)):
            filepath = os.path.join(practice_root, filename)
            if not filename.lower().endswith(".ipynb"):
                continue

            lower_name = filename.lower()
            lesson_num = None
            for n in range(1, 13):
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
            print(f"Registering practice notebook: {title} (Visibility: student)")
            supabase.insert("canonical_materials", {
                "lesson_id": lesson_db_id,
                "title": title,
                "type": "code_repo",
                "storage_url": storage_path,
                "visibility": "student",
                "metadata": {
                    "file_hash": file_hash,
                    "original_filename": filename,
                    "display_mode": "both"
                }
            })

        # Process Lesson 13 (Final Evaluation & Project) from 03, 04, 05
        final_lesson_id = lessons[13]["id"]
        
        # 1. Final Test
        final_test_root = os.path.join(SOURCE_ROOT, "03. Final Test - Final Project", "Final test")
        for filename in os.listdir(final_test_root):
            filepath = os.path.join(final_test_root, filename)
            if filename.endswith(".docx"):
                pdf_filename = filename.replace(".docx", ".pdf")
                pdf_filepath = os.path.join(final_test_root, pdf_filename)
                if converter.convert_docx_to_pdf(filepath, pdf_filepath):
                    file_hash = get_file_hash(pdf_filepath)
                    raw_path = f"courses/apm/lesson-13/{pdf_filename.replace('.pdf', '')}_{file_hash[:10]}.pdf"
                    storage_path = sanitize_storage_path(raw_path)
                    supabase.upload_file("teaching-materials", storage_path, pdf_filepath)
                    supabase.insert("canonical_materials", {
                        "lesson_id": final_lesson_id,
                        "title": filename.replace(".docx", ""),
                        "type": "pdf",
                        "storage_url": storage_path,
                        "visibility": "student",
                        "metadata": {"file_hash": file_hash}
                    })

        # 2. Final Project
        final_project_root = os.path.join(SOURCE_ROOT, "03. Final Test - Final Project", "Final Project")
        for filename in os.listdir(final_project_root):
            filepath = os.path.join(final_project_root, filename)
            if filename.endswith(".docx"):
                pdf_filename = filename.replace(".docx", ".pdf")
                pdf_filepath = os.path.join(final_project_root, pdf_filename)
                if converter.convert_docx_to_pdf(filepath, pdf_filepath):
                    file_hash = get_file_hash(pdf_filepath)
                    raw_path = f"courses/apm/lesson-13/{pdf_filename.replace('.pdf', '')}_{file_hash[:10]}.pdf"
                    storage_path = sanitize_storage_path(raw_path)
                    supabase.upload_file("teaching-materials", storage_path, pdf_filepath)
                    supabase.insert("canonical_materials", {
                        "lesson_id": final_lesson_id,
                        "title": filename.replace(".docx", ""),
                        "type": "pdf",
                        "storage_url": storage_path,
                        "visibility": "student",
                        "metadata": {"file_hash": file_hash}
                    })
            elif filename.endswith(".xlsx"):
                file_hash = get_file_hash(filepath)
                raw_path = f"courses/apm/lesson-13/{os.path.splitext(filename)[0]}_{file_hash[:10]}.xlsx"
                storage_path = sanitize_storage_path(raw_path)
                supabase.upload_file("teaching-materials", storage_path, filepath)
                supabase.insert("canonical_materials", {
                    "lesson_id": final_lesson_id,
                    "title": filename,
                    "type": "xlsx",
                    "storage_url": storage_path,
                    "visibility": "student",
                    "metadata": {"file_hash": file_hash}
                })

        # 3. Project tham khảo (Reference projects)
        ref_root = os.path.join(SOURCE_ROOT, "04. Project tham khảo")
        for filename in os.listdir(ref_root):
            filepath = os.path.join(ref_root, filename)
            if filename.endswith(".pdf"):
                file_hash = get_file_hash(filepath)
                raw_path = f"courses/apm/lesson-13/reference/{os.path.splitext(filename)[0]}_{file_hash[:10]}.pdf"
                storage_path = sanitize_storage_path(raw_path)
                supabase.upload_file("teaching-materials", storage_path, filepath)
                supabase.insert("canonical_materials", {
                    "lesson_id": final_lesson_id,
                    "title": f"Project tham khảo: {filename.replace('.pdf', '')}",
                    "type": "pdf",
                    "storage_url": storage_path,
                    "visibility": "student",
                    "metadata": {"file_hash": file_hash}
                })

        # 4. Bài giải mẫu Final test (Teacher only!)
        solution_root = os.path.join(SOURCE_ROOT, "05. Bài giải mẫu Final test")
        for filename in os.listdir(solution_root):
            filepath = os.path.join(solution_root, filename)
            if filename.endswith(".pdf"):
                file_hash = get_file_hash(filepath)
                raw_path = f"courses/apm/lesson-13/solutions/{os.path.splitext(filename)[0]}_{file_hash[:10]}.pdf"
                storage_path = sanitize_storage_path(raw_path)
                supabase.upload_file("teaching-materials", storage_path, filepath)
                supabase.insert("canonical_materials", {
                    "lesson_id": final_lesson_id,
                    "title": f"Bài giải mẫu: {filename.replace('.pdf', '')}",
                    "type": "pdf",
                    "storage_url": storage_path,
                    "visibility": "teacher",
                    "metadata": {"file_hash": file_hash}
                })

        print("\n====================================================")
        print("SEEDING COMPLETED SUCCESSFULLY!")
        print("====================================================")

    except Exception as err:
        print(f"\nFatal error during seeding: {err}")
    finally:
        converter.cleanup()

if __name__ == "__main__":
    run_process_and_seed()
