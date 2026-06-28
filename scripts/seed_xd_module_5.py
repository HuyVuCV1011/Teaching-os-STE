import os
import sys
import json
import hashlib
import mimetypes
import re
import time
import win32com.client
import requests

sys.stdout.reconfigure(encoding='utf-8')

# Source directory containing the 18 folders
SOURCE_ROOT = r"D:\HuyVu-Workspace\02_Teaching\MindX\Tài liệu XD\Tổng hợp đề\Tổng hợp đề"

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
        'Ò':'O','Ó':'O','Ỏ':'O','Õ':'O','Ô':'O','Ồ':'O','Ố':'O','Ổ':'O','Ộ':'O','Ơ':'O','Ờ':'O','Ớ':'O','Ở':'O','Ỡ':'O','Ợ':'O',
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
        
        file_size_mb = os.path.getsize(local_filepath) / 1024 / 1024
        print(f"Uploading {os.path.basename(local_filepath)} ({file_size_mb:.2f} MB) to '{escaped_path}'...")
        
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

def generate_lesson_content(lesson_title):
    return f"""<h3>Mục tiêu Case Study</h3>
<p>Luyện tập kỹ năng phân tích và giải quyết bài toán xử lý dữ liệu thông qua đề phỏng vấn thực tế của doanh nghiệp: <strong>{lesson_title}</strong>.</p>
<h3>Yêu cầu đối với học viên</h3>
<ul>
  <li>Đọc kỹ yêu cầu nghiệp vụ và tài liệu mô tả dữ liệu đi kèm.</li>
  <li>Thực hiện viết các câu lệnh truy vấn SQL, code Python (EDA/Modeling) hoặc thiết kế dashboard báo cáo Power BI tương ứng.</li>
  <li>Đối chiếu kết quả thực hiện với file đáp án chi tiết và hướng dẫn chấm từ giảng viên.</li>
</ul>"""

def seed_module_5():
    print("====================================================")
    print("STARTING SEEDING FOR X-DATA (XD) COURSE MODULE 5")
    print("====================================================")
    
    converter = OfficeConverter()
    supabase = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)

    try:
        # 1. Fetch course ID for XD
        course_slug = "xd"
        course = supabase.select_one("courses", {"slug": course_slug})
        if not course:
            print("Error: Course X-Data (XD) not found in database.")
            sys.exit(1)
            
        course_id = course["id"]
        print(f"Found Course 'X-Data (XD)' (ID: {course_id})")

        # 2. Check/Create Module 5
        module_title = "Tổng hợp đề phỏng vấn & Case Study"
        module_order = 5
        module = supabase.select_one("modules", {"course_id": course_id, "title": module_title})
        if not module:
            print(f"Creating Module 5: '{module_title}'...")
            module = supabase.insert("modules", {
                "course_id": course_id,
                "title": module_title,
                "order_index": module_order
            })[0]
        else:
            print(f"Module 5 already exists (ID: {module['id']})")
            
        module_id = module["id"]

        # 3. Scan and sort directories to create lessons
        folders = []
        for folder_name in os.listdir(SOURCE_ROOT):
            folder_path = os.path.join(SOURCE_ROOT, folder_name)
            if os.path.isdir(folder_path):
                folders.append(folder_name)
        
        # Sort folders alphabetically to determine order index
        folders = sorted(folders)
        print(f"Found {len(folders)} case study folders to seed.")

        # 4. Iterate folders and seed lessons
        for idx, folder_name in enumerate(folders, 1):
            folder_path = os.path.join(SOURCE_ROOT, folder_name)
            print(f"\n====================================================")
            print(f"PROCESSING LESSON {idx}: {folder_name}")
            print("====================================================")
            
            # Check or create lesson
            lesson = supabase.select_one("lessons", {"module_id": module_id, "title": folder_name})
            if not lesson:
                print(f"Creating Lesson: '{folder_name}'...")
                lesson = supabase.insert("lessons", {
                    "module_id": module_id,
                    "title": folder_name,
                    "order_index": idx,
                    "content": generate_lesson_content(folder_name),
                    "download_allowed": True,
                    "grid_layout": "1-col"
                })[0]
            else:
                print(f"Lesson '{folder_name}' already exists (ID: {lesson['id']})")
                
            lesson_id = lesson["id"]

            # Scan and upload files recursively
            def process_directory(current_dir, relative_prefix=""):
                for filename in os.listdir(current_dir):
                    filepath = os.path.join(current_dir, filename)
                    
                    # If directory, call recursively
                    if os.path.isdir(filepath):
                        process_directory(filepath, relative_prefix + filename + "/")
                        continue

                    # Filter unwanted files
                    lower_name = filename.lower()
                    if lower_name == ".ds_store" or filename.startswith("~$") or lower_name.endswith(".py"):
                        continue

                    upload_filepath = filepath
                    material_type = ""
                    title = filename
                    
                    # Convert office documents
                    if lower_name.endswith(".docx"):
                        pdf_filename = filename.replace(".docx", ".pdf")
                        pdf_filepath = os.path.join(current_dir, pdf_filename)
                        
                        # Optimization: check if PDF is already generated and newer than docx
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
                                print(f"Failed to convert {filename} to PDF.")
                                continue
                        else:
                            print(f"PDF already exists for {filename}. Skipping conversion.")
                            upload_filepath = pdf_filepath
                            material_type = "pdf"
                            title = filename.replace(".docx", "")
                            
                    elif lower_name.endswith(".pptx"):
                        pdf_filename = filename.replace(".pptx", ".pdf")
                        pdf_filepath = os.path.join(current_dir, pdf_filename)
                        
                        # Optimization: check if PDF is already generated and newer than pptx
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
                                print(f"Failed to convert {filename} to PDF.")
                                continue
                        else:
                            print(f"PDF already exists for {filename}. Skipping conversion.")
                            upload_filepath = pdf_filepath
                            material_type = "pdf"
                            title = filename.replace(".pptx", " (Slides)")
                            
                    elif lower_name.endswith(".ipynb"):
                        material_type = "code_repo"
                    elif lower_name.endswith(".sql"):
                        material_type = "code_repo"
                    elif lower_name.endswith(".xlsx") or lower_name.endswith(".xls"):
                        material_type = "xlsx"
                    elif lower_name.endswith(".csv"):
                        material_type = "csv"
                    elif lower_name.endswith(".pdf"):
                        material_type = "pdf"
                    else:
                        material_type = "link"

                    # Determine Visibility (teacher-only vs student/both)
                    is_teacher_only = any(kw in lower_name for kw in ["teacher", "dap_an", "dap an", "solution", "bai_giai", "bai giai", "sol"]) or \
                                      any(kw in current_dir.lower() for kw in ["bài giải", "solution", "dap an"])
                                      
                    if is_teacher_only:
                        visibility = "teacher"
                    else:
                        # docx converted files are student only, others are both
                        if lower_name.endswith(".docx"):
                            visibility = "student"
                        else:
                            visibility = "both"

                    # Storage configuration
                    file_hash = get_file_hash(upload_filepath)
                    ext = os.path.splitext(upload_filepath)[1]
                    storage_filename = f"{os.path.splitext(os.path.basename(upload_filepath))[0]}_{file_hash[:10]}{ext}"
                    raw_path = f"courses/xd/module-5/{idx}/{relative_prefix}{storage_filename}"
                    storage_path = sanitize_storage_path(raw_path)

                    # Upload to Supabase Storage bucket 'teaching-materials'
                    supabase.upload_file("teaching-materials", storage_path, upload_filepath)

                    # Register in canonical_materials table
                    existing_mat = supabase.select_one("canonical_materials", {
                        "lesson_id": lesson_id,
                        "storage_url": storage_path
                    })
                    
                    if existing_mat:
                        print(f"Material '{title}' already registered (ID: {existing_mat['id']}). Skipping insertion.")
                    else:
                        print(f"Registering material: {title} (Visibility: {visibility}, Type: {material_type})")
                        supabase.insert("canonical_materials", {
                            "lesson_id": lesson_id,
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

        print("\n====================================================")
        print("SEEDING COMPLETED SUCCESSFULLY FOR XD MODULE 5!")
        print("====================================================")

    except Exception as err:
        print(f"\nFatal error during Module 5 seeding: {err}")
    finally:
        converter.cleanup()

if __name__ == "__main__":
    seed_module_5()
