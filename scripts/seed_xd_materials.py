import os
import sys
import json
import hashlib
import mimetypes
import re
import win32com.client
import requests

sys.stdout.reconfigure(encoding='utf-8')

SOURCE_ROOT = r"D:\HuyVu-Workspace\02_Teaching\drive-download-20260620T191028Z-3-001\Tài liệu XD"

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

def get_file_hash(filepath):
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while True:
            data = f.read(65536)
            if not data:
                break
            sha256.update(data)
    return sha256.hexdigest()

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
        'Ò':'O','Ó':'O','Ỏ':'O','Õ':'O','Ô':'O','Ồ':'O','Ố':'O','Ổ':'O','Ỗ':'O','Ộ':'O','Ơ':'O','Ờ':'O','Ớ':'O','Ở':'O','Ỡ':'O','Ợ':'O',
        'Ù':'U','Ú':'U','Ủ':'U','Ư':'U','Ừ':'U','Ứ':'U','Ử':'U','Ữ':'U','Ự':'U',
        'Ỳ':'Y','Ý':'Y','Ỷ':'Y','Ỹ':'Y','Ỵ':'Y'
    }
    for part in parts:
        for k, v in vietnamese_map.items():
            part = part.replace(k, v)
        part = re.sub(r'[^a-zA-Z0-9._-]', '-', part)
        part = re.sub(r'-+', '-', part).strip('-')
        sanitized_parts.append(part)
    return '/'.join(sanitized_parts)

class OfficeConverter:
    def convert_pptx_to_pdf(self, pptx_path, pdf_path):
        powerpoint = None
        try:
            powerpoint = win32com.client.Dispatch("PowerPoint.Application")
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
            word.Visible = False
            abs_docx = os.path.abspath(docx_path)
            abs_pdf = os.path.abspath(pdf_path)
            print(f"Converting DOCX to PDF: {os.path.basename(docx_path)}")
            doc = word.Documents.Open(abs_docx)
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

    def upload_file(self, bucket, storage_path, local_filepath):
        mime_type, _ = mimetypes.guess_type(local_filepath)
        if not mime_type:
            if local_filepath.endswith('.ipynb'):
                mime_type = 'application/x-ipynb+json'
            elif local_filepath.endswith('.sql'):
                mime_type = 'text/plain'
            else:
                mime_type = 'application/octet-stream'

        escaped_path = storage_path.replace("\\", "/").strip("/")
        endpoint = f"{self.url}/storage/v1/object/{bucket}/{escaped_path}"
        
        headers = self.storage_headers.copy()
        headers["Content-Type"] = mime_type
        headers["x-upsert"] = "true"
        
        print(f"Uploading {os.path.basename(local_filepath)} to '{escaped_path}'...")
        with open(local_filepath, 'rb') as f:
            file_data = f.read()

        res = requests.post(endpoint, data=file_data, headers=headers)
        if res.status_code not in (200, 201):
            print(f"Failed to upload {local_filepath}: Status {res.status_code}, Response: {res.text}")
            res.raise_for_status()
        return res.json()

def run_process_and_seed():
    print("====================================================")
    print("STEP 1: INITIALIZING CONVERTERS AND CLIENTS")
    print("====================================================")
    converter = OfficeConverter()
    supabase = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)

    try:
        # 1. Fetch "Data Analytics" Subject
        subject_title = "Data Analytics"
        subject = supabase.select_one("subjects", {"name": subject_title})
        if not subject:
            print("Creating Subject: Data Analytics...")
            subject = supabase.insert("subjects", {
                "name": subject_title,
                "slug": "data-analytics",
                "description": "Chuyên ngành phân tích dữ liệu ứng dụng"
            })[0]
        
        # 2. Create "X-Data (XD)" Course
        course_title = "X-Data (XD)"
        course_slug = "xd"
        course = supabase.select_one("courses", {"slug": course_slug})
        if not course:
            print("Creating Course: X-Data (XD)...")
            course = supabase.insert("courses", {
                "title": course_title,
                "slug": course_slug,
                "subject_id": subject["id"],
                "status": "published",
                "version": 1
            })[0]
        else:
            print(f"Course '{course_title}' already exists (ID: {course['id']})")

        # 3. Define Modules
        modules_def = [
            {"title": "SQL & Hệ quản trị cơ sở dữ liệu", "order": 1},
            {"title": "Business Intelligence & Trực quan hóa dữ liệu", "order": 2},
            {"title": "Machine Learning & Phân tích dự báo", "order": 3},
            {"title": "Career Path & Hướng nghiệp", "order": 4}
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

        # Helper to map Lesson number to Module ID
        def get_module_for_lesson(n):
            if n in (1, 2, 3): return modules[1]["id"]
            if n in (4, 5, 6): return modules[2]["id"]
            if n in (7, 8, 9): return modules[3]["id"]
            if n in (13, 14, 15): return modules[4]["id"]
            return modules[4]["id"]

        # Helper to get order_index in database based on lesson folder number
        def get_order_index(n):
            mapping = {1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 13:10, 14:11, 15:12}
            return mapping.get(n, n)

        # 4. Scan local folders and create lessons
        lessons = {}
        
        # Loop through lesson directories
        for folder_name in sorted(os.listdir(SOURCE_ROOT)):
            folder_path = os.path.join(SOURCE_ROOT, folder_name)
            if not os.path.isdir(folder_path):
                continue
            if not folder_name.lower().startswith("lesson "):
                continue

            # Parse lesson number
            try:
                n_str = folder_name.split(" ")[1]
                lesson_num = int(n_str)
            except ValueError:
                continue

            m_id = get_module_for_lesson(lesson_num)
            db_order = get_order_index(lesson_num)
            
            l_db = supabase.select_one("lessons", {"module_id": m_id, "title": folder_name})
            if not l_db:
                print(f"Creating Lesson {lesson_num}: {folder_name}...")
                l_db = supabase.insert("lessons", {
                    "module_id": m_id,
                    "title": folder_name,
                    "order_index": db_order,
                    "content": f"<h3>Giới thiệu nội dung {folder_name}</h3><p>Đây là tài liệu giảng dạy lý thuyết, slide bài giảng, code mẫu và các bài tập thực hành dành cho buổi học.</p>",
                    "download_allowed": True,
                    "grid_layout": "1-col"
                })[0]
            lessons[lesson_num] = l_db

            # Now recursively scan and upload files for this lesson folder
            print(f"\n--- Scanning files in: {folder_name} ---")
            
            def process_directory(current_dir, relative_prefix=""):
                for filename in os.listdir(current_dir):
                    filepath = os.path.join(current_dir, filename)
                    if os.path.isdir(filepath):
                        # Recursive call for subdirectories (e.g. Bài giải, Dataset, etc.)
                        process_directory(filepath, relative_prefix + filename + "/")
                        continue

                    lower_name = filename.lower()
                    if lower_name == ".ds_store":
                        continue

                    upload_filepath = filepath
                    material_type = ""
                    visibility = "both"
                    title = filename

                    # Determine type and perform conversion if needed
                    if lower_name.endswith(".pptx"):
                        pdf_filename = filename.replace(".pptx", ".pdf")
                        pdf_filepath = os.path.join(current_dir, pdf_filename)
                        if converter.convert_pptx_to_pdf(filepath, pdf_filepath):
                            upload_filepath = pdf_filepath
                            material_type = "pdf"
                            title = filename.replace(".pptx", " (Slides)")
                        else:
                            continue
                        
                        if "teacher" in lower_name:
                            visibility = "teacher"
                        else:
                            visibility = "both"

                    elif lower_name.endswith(".docx"):
                        pdf_filename = filename.replace(".docx", ".pdf")
                        pdf_filepath = os.path.join(current_dir, pdf_filename)
                        if converter.convert_docx_to_pdf(filepath, pdf_filepath):
                            upload_filepath = pdf_filepath
                            material_type = "pdf"
                            title = filename.replace(".docx", "")
                        else:
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
                            visibility = "both"

                    elif lower_name.endswith(".sql"):
                        material_type = "code_repo"
                        title = filename
                        visibility = "both"

                    elif lower_name.endswith(".xlsx") or lower_name.endswith(".xls"):
                        material_type = "xlsx"
                        title = filename
                        visibility = "both"

                    elif lower_name.endswith(".csv"):
                        material_type = "csv"
                        title = filename
                        visibility = "both"

                    elif lower_name.endswith(".pdf"):
                        material_type = "pdf"
                        title = filename
                        if "teacher" in lower_name:
                            visibility = "teacher"
                        else:
                            visibility = "both"

                    else:
                        # Upload raw files (e.g. .pbix) with generic/link type
                        material_type = "link"
                        title = filename
                        visibility = "both"

                    # Compile storage path
                    file_hash = get_file_hash(upload_filepath)
                    ext = os.path.splitext(upload_filepath)[1]
                    storage_filename = f"{os.path.splitext(os.path.basename(upload_filepath))[0]}_{file_hash[:10]}{ext}"
                    raw_path = f"courses/xd/lesson-{lesson_num}/{relative_prefix}{storage_filename}"
                    storage_path = sanitize_storage_path(raw_path)

                    # Upload to Supabase Storage
                    supabase.upload_file("teaching-materials", storage_path, upload_filepath)

                    # Register in canonical_materials
                    existing_mat = supabase.select_one("canonical_materials", {
                        "lesson_id": l_db["id"],
                        "storage_url": storage_path
                    })
                    if existing_mat:
                        print(f"Material '{title}' already registered in DB (ID: {existing_mat['id']}). Skipping insertion.")
                    else:
                        print(f"Registering canonical material: {title} (Visibility: {visibility}, Type: {material_type})")
                        supabase.insert("canonical_materials", {
                            "lesson_id": l_db["id"],
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

            process_directory(folder_path)

        # Upload Shopee SQL test.sql if it exists
        shopee_sql = os.path.join(SOURCE_ROOT, "Shopee SQL test.sql")
        if os.path.exists(shopee_sql) and 3 in lessons:
            l_db = lessons[3]
            file_hash = get_file_hash(shopee_sql)
            storage_path = sanitize_storage_path(f"courses/xd/lesson-3/Shopee_SQL_test_{file_hash[:10]}.sql")
            supabase.upload_file("teaching-materials", storage_path, shopee_sql)
            
            existing_shopee = supabase.select_one("canonical_materials", {
                "lesson_id": l_db["id"],
                "storage_url": storage_path
            })
            if existing_shopee:
                print("Shopee SQL test.sql already registered in Lesson 3. Skipping insertion.")
            else:
                print(f"Registering Shopee SQL test.sql in Lesson 3...")
                supabase.insert("canonical_materials", {
                    "lesson_id": l_db["id"],
                    "title": "Shopee SQL test.sql",
                    "type": "code_repo",
                    "storage_url": storage_path,
                    "visibility": "both",
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
