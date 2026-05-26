import urllib.request
import json
import os
import ssl
import hashlib

# Bypass SSL verify for self-signed or local certificates
context = ssl._create_unverified_context()

url = "https://zuwsvvpzivukrfegqgsp.supabase.co"
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "your-supabase-service-role-key"

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

def post_request(endpoint, data):
    req = urllib.request.Request(f"{url}/rest/v1/{endpoint}", headers=headers, method="POST", data=json.dumps(data).encode("utf-8"))
    req.add_header("Prefer", "return=representation")
    try:
        with urllib.request.urlopen(req, context=context) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error posting to {endpoint}: {e}")
        return None

def upload_to_storage(bucket, filepath, file_bytes):
    storage_url = f"{url}/storage/v1/object/{bucket}/{filepath}"
    upload_headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/pdf"
    }
    req = urllib.request.Request(storage_url, headers=upload_headers, method="POST", data=file_bytes)
    try:
        with urllib.request.urlopen(req, context=context) as response:
            res_data = json.loads(response.read().decode())
            print(f"Uploaded {filepath} successfully: {res_data}")
            return True
    except Exception as e:
        print(f"Error uploading {filepath}: {e}")
        # Try PUT (overwrite/upsert)
        req_put = urllib.request.Request(storage_url, headers=upload_headers, method="PUT", data=file_bytes)
        try:
            with urllib.request.urlopen(req_put, context=context) as response:
                res_data = json.loads(response.read().decode())
                print(f"Uploaded (PUT) {filepath} successfully: {res_data}")
                return True
        except Exception as ex:
            print(f"Failed PUT upload: {ex}")
            return False

def run_ingest():
    # 1. Create or Get Subject
    subject_slug = "data-analytics"
    subject_data = {
        "slug": subject_slug,
        "name": "Data Analytics",
        "description": "Analyze data, build dashboards, perform statistical analysis, and machine learning model training."
    }
    print("Registering subject...")
    post_request("subjects", [subject_data])

    req_get_sub = urllib.request.Request(f"{url}/rest/v1/subjects?slug=eq.{subject_slug}&select=id", headers=headers)
    with urllib.request.urlopen(req_get_sub, context=context) as response:
        sub_query = json.loads(response.read().decode())
        subject_id = sub_query[0]["id"]
    print("Subject ID:", subject_id)

    # 2. Create or Get Course
    course_slug = "data-analyst-level-3"
    course_data = {
        "subject_id": subject_id,
        "slug": course_slug,
        "title": "Data Analyst Level 3 (X-Data)",
        "description": "A comprehensive course covering data analysis, SQL databases, Power BI, Python libraries, and Machine Learning models.",
        "status": "published",
        "version": 1
    }
    print("Registering course...")
    post_request("courses", [course_data])

    req_get_course = urllib.request.Request(f"{url}/rest/v1/courses?slug=eq.{course_slug}&select=id", headers=headers)
    with urllib.request.urlopen(req_get_course, context=context) as response:
        course_query = json.loads(response.read().decode())
        course_id = course_query[0]["id"]
    print("Course ID:", course_id)

    # 3. Create or Get Module
    module_data = {
        "course_id": course_id,
        "title": "Module 1: Final Test & Projects",
        "order_index": 1
    }
    print("Registering module...")
    post_request("modules", [module_data])

    req_get_module = urllib.request.Request(f"{url}/rest/v1/modules?course_id=eq.{course_id}&select=id", headers=headers)
    with urllib.request.urlopen(req_get_module, context=context) as response:
        module_query = json.loads(response.read().decode())
        module_id = module_query[0]["id"]
    print("Module ID:", module_id)

    # 4. Create Lessons and Upload Materials
    lessons_to_create = [
        {
            "title": "Lesson 1 Homework: Basic Python Programming",
            "order_index": 1,
            "content": '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Homework assignments for Python basics: taxi fare, library system, temperature, and passwords."}]}]}',
            "file_path": "/Users/mac/Data/MindX/teaching/Dạy Data/Tài liệu DA (từ 10-10-2025)/01. Tài liệu lý thuyết/Lesson 1/Bài tập về nhà buổi 1.pdf",
            "material_title": "Lesson 1 Homework Guide (PDF)"
        },
        {
            "title": "Final Test: Data Analyst Examination",
            "order_index": 2,
            "content": '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Comprehensive level 3 final test exam covering SQL, Python dashboard interpretation, and coding."}]}]}',
            "file_path": "/Users/mac/Data/MindX/teaching/Dạy Data/Tài liệu DA (từ 10-10-2025)/03. Final Test - Final Project/Final test/[X-Data _ Kỳ 3] Final Test.pdf",
            "material_title": "Final Test Exam Paper (PDF)"
        },
        {
            "title": "Final Project: Business Case Studies & ML Models",
            "order_index": 3,
            "content": '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Automotive pricing, credit risk churn analysis, and market segmentation project guidelines."}]}]}',
            "file_path": "/Users/mac/Data/MindX/teaching/Dạy Data/Tài liệu DA (từ 10-10-2025)/03. Final Test - Final Project/Final Project/[ADA-3] Đề bài-Final Project.pdf",
            "material_title": "Final Project Description (PDF)"
        }
    ]

    for lesson in lessons_to_create:
        print(f"\nProcessing lesson: {lesson['title']}...")
        lesson_data = {
            "module_id": module_id,
            "title": lesson["title"],
            "order_index": lesson["order_index"],
            "content": lesson["content"]
        }
        # Create lesson
        post_request("lessons", [lesson_data])
        
        # Query to get lesson ID
        req_get_lesson = urllib.request.Request(f"{url}/rest/v1/lessons?module_id=eq.{module_id}&order_index=eq.{lesson['order_index']}&select=id", headers=headers)
        with urllib.request.urlopen(req_get_lesson, context=context) as response:
            lesson_query = json.loads(response.read().decode())
            lesson_id = lesson_query[0]["id"]
        print("Lesson ID:", lesson_id)
        
        # Load file and calculate hash
        with open(lesson["file_path"], "rb") as f:
            file_bytes = f.read()
        
        sha256 = hashlib.sha256(file_bytes).hexdigest()
        file_hash = sha256[:16]
        print(f"File hash: {file_hash}")
        
        # Upload to storage
        ext = "pdf"
        lesson_order = str(lesson["order_index"]).zfill(2)
        storage_path = f"subjects/{subject_slug}/{course_slug}/{lesson_order}_{file_hash}.{ext}"
        
        upload_success = upload_to_storage("teaching-materials", storage_path, file_bytes)
        
        if upload_success:
            # Register in canonical_materials
            material_data = {
                "lesson_id": lesson_id,
                "title": lesson["material_title"],
                "type": "pdf",
                "storage_url": storage_path,
                "metadata": {
                    "file_hash": file_hash,
                    "file_name": os.path.basename(lesson["file_path"]),
                    "file_size": len(file_bytes)
                }
            }
            print("Registering material...")
            mat_res = post_request("canonical_materials", [material_data])
            print("Material response:", mat_res)

    # 5. Link Course to DATA-2026 Class Cohort
    class_code = "DATA-2026"
    print(f"\nLinking course to class {class_code}...")
    try:
        # Get class ID
        req_get_class = urllib.request.Request(f"{url}/rest/v1/classes?class_code=eq.{class_code}&select=id", headers=headers)
        with urllib.request.urlopen(req_get_class, context=context) as response:
            class_query = json.loads(response.read().decode())
            if class_query and len(class_query) > 0:
                class_id = class_query[0]["id"]
                print("Class ID:", class_id)
                
                # Insert class_courses mapping
                class_course_data = {
                    "class_id": class_id,
                    "course_id": course_id
                }
                cc_res = post_request("class_courses", [class_course_data])
                print("Link Response:", cc_res)
            else:
                print(f"Class code {class_code} not found in database.")
    except Exception as e:
        print(f"Failed to link course to class: {e}")

if __name__ == "__main__":
    run_ingest()
