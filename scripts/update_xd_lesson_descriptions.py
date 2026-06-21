import os
import sys
import requests

sys.stdout.reconfigure(encoding='utf-8')

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

    def update(self, table, record_id, data):
        endpoint = f"{self.url}/rest/v1/{table}"
        params = {"id": f"eq.{record_id}"}
        res = requests.patch(endpoint, json=data, params=params, headers=self.headers)
        if res.status_code not in (200, 204):
            print(f"Failed to update {table} ID {record_id}: Status {res.status_code}, Response: {res.text}")
            res.raise_for_status()
        return res.json() if res.content else None

# Detailed HTML content for each lesson
LESSON_CONTENTS = {
    1: """
<h3>Mục tiêu buổi học</h3>
<p>Buổi học này giúp học viên làm quen với các kỹ thuật viết truy vấn SQL nâng cao để xử lý dữ liệu phức tạp. Học viên sẽ học cách phân rã bài toán lớn thành các truy vấn con hoặc các khối lệnh tái sử dụng được, tối ưu hóa quá trình truy xuất dữ liệu từ nhiều nguồn khác nhau.</p>
<h3>Nội dung chính</h3>
<ul>
  <li><strong>Truy vấn con (Subquery):</strong> Viết và ứng dụng Subquery trong mệnh đề SELECT, FROM và WHERE.</li>
  <li><strong>Common Table Expressions (CTE):</strong> Sử dụng biểu thức bảng tạm CTE để cấu trúc câu truy vấn tường minh, dễ đọc và dễ bảo trì.</li>
  <li><strong>Toán tử tập hợp:</strong> Phân biệt và ứng dụng UNION, UNION ALL, INTERSECT, EXCEPT để gộp hoặc đối chiếu tập dữ liệu.</li>
  <li><strong>Lọc trùng lặp & Điều kiện nâng cao:</strong> Tối ưu hóa việc lọc bản ghi bằng DISTINCT và mệnh đề logic phức tạp.</li>
  <li><strong>Thực thi động (Exec):</strong> Hiểu nguyên lý thực thi câu lệnh SQL động và ứng dụng cơ bản.</li>
</ul>
""",
    2: """
<h3>Mục tiêu buổi học</h3>
<p>Buổi học tập trung vào các đối tượng lập trình nâng cao trong cơ sở dữ liệu quan hệ (DBMS), các kỹ thuật xoay chiều dữ liệu phức tạp phục vụ báo cáo và tối ưu hóa tốc độ truy xuất bằng Index.</p>
<h3>Nội dung chính</h3>
<ul>
  <li><strong>Hàm tự định nghĩa (User-Defined Functions):</strong> Xây dựng Scalar Functions và Table-Valued Functions để đóng gói logic xử lý dữ liệu.</li>
  <li><strong>Thủ tục lưu trữ (Stored Procedures):</strong> Viết Stored Procedures hỗ trợ tham số đầu vào (Input) và đầu ra (Output), điều khiển luồng dữ liệu.</li>
  <li><strong>Xoay chiều dữ liệu (PIVOT & UNPIVOT):</strong> Biến đổi dòng thành cột và ngược lại để tái cấu trúc bảng dữ liệu phục vụ trực quan hóa BI.</li>
  <li><strong>Tăng tốc truy vấn với Index:</strong> Nguyên lý hoạt động của Clustered Index và Non-Clustered Index, cách thiết lập Index thông minh để tối ưu hiệu năng.</li>
</ul>
""",
    3: """
<h3>Mục tiêu buổi học</h3>
<p>Học viên đi sâu vào phân tích hiệu năng của hệ quản trị cơ sở dữ liệu quan hệ, học cách tìm điểm nghẽn (bottleneck) trong câu truy vấn SQL và thực hành các phương pháp tối ưu hóa câu lệnh thực tế.</p>
<h3>Nội dung chính</h3>
<ul>
  <li><strong>Đọc hiểu Sơ đồ thực thi (Execution Plan):</strong> Phân tích chi tiết các chỉ số Scan, Seek, Join Cost để phát hiện nguyên nhân câu lệnh chạy chậm.</li>
  <li><strong>Tối ưu hóa phép JOIN và mệnh đề lọc:</strong> Kỹ thuật viết lại truy vấn tối ưu cho các lệnh JOIN phức tạp, GROUP BY và WHERE.</li>
  <li><strong>SARGable Queries:</strong> Cách viết câu lệnh tuân thủ chuẩn tìm kiếm SARGable để tận dụng tối đa Index có sẵn.</li>
  <li><strong>Thực hành Case Study thực tế:</strong> Giải quyết bài toán tối ưu trực tiếp trên đề bài Shopee SQL Test thực tế.</li>
</ul>
""",
    4: """
<h3>Mục tiêu buổi học</h3>
<p>Chuyển sang giai đoạn Business Intelligence (BI). Buổi học hướng dẫn phương pháp đánh giá chất lượng dữ liệu, thiết lập quy trình ETL (Extract - Transform - Load) để làm sạch và chuẩn hóa dữ liệu thô trước khi đưa vào phân tích.</p>
<h3>Nội dung chính</h3>
<ul>
  <li><strong>Phân tích Chất lượng Dữ liệu (Data Quality):</strong> Nhận diện các lỗi dữ liệu phổ biến như sai định dạng, thiếu dữ liệu (Null/Blank), hoặc dữ liệu mâu thuẫn.</li>
  <li><strong>Làm sạch dữ liệu trong Power Query:</strong> Kỹ thuật tách/gộp cột, chuẩn hóa kiểu dữ liệu, điền giá trị thiếu (Imputation) và loại bỏ bản ghi lỗi.</li>
  <li><strong>Thiết lập quy trình ETL chuẩn:</strong> Cấu trúc các bước xử lý dữ liệu tự động hóa, tối ưu hóa hiệu năng làm mới dữ liệu (Data Refresh).</li>
</ul>
""",
    5: """
<h3>Mục tiêu buổi học</h3>
<p>Hướng dẫn nghệ thuật trực quan hóa dữ liệu hiệu quả bằng Power BI. Học viên sẽ học cách lựa chọn biểu đồ phù hợp, thiết kế giao diện Dashboard theo chuẩn doanh nghiệp và tối ưu trải nghiệm người dùng.</p>
<h3>Nội dung chính</h3>
<ul>
  <li><strong>Nguyên lý thiết kế Dashboard:</strong> Bố cục thông tin (Visual Hierarchy), phối màu chuyên nghiệp (Color Palettes), và tránh các lỗi thiết kế trực quan.</li>
  <li><strong>Lựa chọn biểu đồ tối ưu:</strong> Sử dụng đúng biểu đồ cột, đường, biểu đồ phân tán (Scatter), Treemap hoặc các thẻ KPI cho từng câu hỏi kinh doanh.</li>
  <li><strong>Tạo tương tác động (Interactivity):</strong> Thiết lập Slicers, Tooltips tùy chỉnh, Drill-down và Drill-through để giúp người dùng khám phá dữ liệu sâu hơn.</li>
  <li><strong>Thực hành xây dựng Dashboard:</strong> Thực hành thiết kế Dashboard phân tích doanh thu trên bộ dữ liệu bán hàng SuperStore.</li>
</ul>
""",
    6: """
<h3>Mục tiêu buổi học</h3>
<p>Xây dựng xương sống cho hệ thống báo cáo BI thông qua mô hình hóa dữ liệu (Data Modeling) chuẩn và làm quen với ngôn ngữ công thức DAX nâng cao để tính toán các chỉ số đo lường hiệu năng của doanh nghiệp.</p>
<h3>Nội dung chính</h3>
<ul>
  <li><strong>Thiết kế Star Schema:</strong> Phân biệt và tổ chức dữ liệu thành các bảng dữ liệu thực tế (Fact tables) và bảng danh mục (Dim tables).</li>
  <li><strong>Quản lý mối quan hệ (Relationships):</strong> Cấu hình quan hệ 1-nhiều, hướng lọc dữ liệu (Cross filter direction) và giải quyết các mối quan hệ vòng lặp.</li>
  <li><strong>Viết công thức DAX cơ bản & nâng cao:</strong> Phân biệt Calculated Column và Measure; sử dụng các hàm tính toán mạnh mẽ như CALCULATE, FILTER.</li>
  <li><strong>Hàm thời gian (Time Intelligence DAX):</strong> Tính toán các chỉ số so sánh theo thời gian (YTD, QTD, MoM, YoY).</li>
</ul>
""",
    7: """
<h3>Mục tiêu buổi học</h3>
<p>Bắt đầu phần Machine Learning (Học máy có giám sát). Học viên sẽ hiểu quy trình chuẩn bị dữ liệu, huấn luyện mô hình dự báo giá trị số liên tục (Hồi quy) và đánh giá độ chính xác của mô hình.</p>
<h3>Nội dung chính</h3>
<ul>
  <li><strong>Tổng quan về Machine Learning:</strong> Phân biệt Học có giám sát (Supervised) và Học không giám sát (Unsupervised).</li>
  <li><strong>Thuật toán Hồi quy tuyến tính (Linear Regression):</strong> Nguyên lý toán học đơn giản, cách fit đường thẳng hồi quy và giải thích hệ số.</li>
  <li><strong>Thuật toán Hồi quy Logistic (Logistic Regression):</strong> Xử lý bài toán phân loại nhị phân (Đúng/Sai, Có/Không).</li>
  <li><strong>Đánh giá mô hình Hồi quy:</strong> Cách đọc và tối ưu hóa các chỉ số sai số như MSE, RMSE, MAE và hệ số xác định R-squared.</li>
</ul>
""",
    8: """
<h3>Mục tiêu buổi học</h3>
<p>Nâng cao năng lực Machine Learning với các thuật toán phân loại (Classification) mạnh mẽ. Học viên sẽ thực hành giải quyết bài toán thực tế về phân khúc rủi ro và dự báo rời bỏ khách hàng.</p>
<h3>Nội dung chính</h3>
<ul>
  <li><strong>Thuật toán Cây quyết định (Decision Tree):</strong> Cách xây dựng cây phân loại, các tiêu chí phân rã (Entropy, Gini).</li>
  <li><strong>Thuật toán Rừng ngẫu nhiên (Random Forest):</strong> Nguyên lý Ensemble Learning và kỹ thuật ghép nhiều cây quyết định để tăng độ chính xác.</li>
  <li><strong>Đánh giá mô hình Phân loại nâng cao:</strong> Cách đọc Confusion Matrix, tối ưu hóa các chỉ số Precision, Recall, F1-Score và đường cong ROC-AUC.</li>
  <li><strong>Xử lý dữ liệu mất cân bằng:</strong> Các phương pháp cân bằng mẫu và chuẩn hóa đặc trưng trước khi huấn luyện mô hình.</li>
</ul>
""",
    9: """
<h3>Mục tiêu buổi học</h3>
<p>Làm quen với trường phái học máy không giám sát, áp dụng để khám phá cấu trúc dữ liệu tự nhiên, phân cụm khách hàng không cần nhãn trước và kỹ thuật giảm số lượng biến số đầu vào.</p>
<h3>Nội dung chính</h3>
<ul>
  <li><strong>Thuật toán phân cụm K-Means Clustering:</strong> Nguyên lý phân cụm dựa trên khoảng cách Euclidean, cách chọn số cụm tối ưu K qua đồ thị Elbow.</li>
  <li><strong>Giảm chiều dữ liệu PCA (Principal Component Analysis):</strong> Phương pháp chiếu dữ liệu từ không gian nhiều chiều về ít chiều hơn mà vẫn giữ được tối đa lượng thông tin.</li>
  <li><strong>Thực hành Case Study Spotify:</strong> Áp dụng phân cụm để phân khúc thói quen và sở thích người nghe nhạc trên dữ liệu Spotify thực tế.</li>
</ul>
""",
    13: """
<h3>Mục tiêu buổi học</h3>
<p>Chuẩn bị hành trang tuyển dụng. Học viên sẽ được hướng dẫn thiết kế một CV chuyên nghiệp chuẩn ngành dữ liệu, làm nổi bật năng lực kỹ thuật và tư duy giải quyết vấn đề bằng số liệu.</p>
<h3>Nội dung chính</h3>
<ul>
  <li><strong>Cấu trúc CV chuẩn ngành Data:</strong> Cách sắp xếp thông tin logic, lựa chọn từ khóa chuyên ngành để tối ưu bộ lọc tự động ATS.</li>
  <li><strong>Trình bày Portfolio & Dự án cá nhân:</strong> Cách viết phần dự án dữ liệu theo công thức: Bài toán -> Giải pháp/Công nghệ -> Kết quả đo lường được.</li>
  <li><strong>Tránh các lỗi CV phổ biến:</strong> Các lỗi định dạng, viết mô tả quá chung chung hoặc thiếu số liệu chứng minh giá trị mang lại.</li>
</ul>
""",
    14: """
<h3>Mục tiêu buổi học</h3>
<p>Rèn luyện kỹ năng trả lời phỏng vấn chuyên nghiệp. Buổi học trang bị cho học viên tâm lý vững vàng, cách giải quyết các bài test kỹ thuật và kỹ năng giao tiếp truyền tải thông tin dữ liệu phức tạp.</p>
<h3>Nội dung chính</h3>
<ul>
  <li><strong>Cấu trúc buổi phỏng vấn Data Analyst:</strong> Chuẩn bị cho các vòng phỏng vấn kỹ thuật (SQL, Python/R, Case Study) và vòng với HR/Director.</li>
  <li><strong>Phương pháp STAR trong trả lời phỏng vấn:</strong> Hướng dẫn trình bày kinh nghiệm cá nhân theo cấu trúc: Situation (Tình huống) - Task (Nhiệm vụ) - Action (Hành động) - Result (Kết quả).</li>
  <li><strong>Giao tiếp và phản biện:</strong> Cách làm rõ yêu cầu từ người phỏng vấn trước khi bắt đầu giải quyết bài toán dữ liệu.</li>
</ul>
""",
    15: """
<h3>Mục tiêu buổi học</h3>
<p>Trải nghiệm phỏng vấn giả định (Mock Interview) 1-1 với giảng viên. Học viên sẽ cọ xát trực tiếp với áp lực phòng thi và nhận phản hồi chi tiết về cả kiến thức chuyên môn lẫn kỹ năng mềm.</p>
<h3>Nội dung chính</h3>
<ul>
  <li><strong>Phỏng vấn thử nghiệm thực tế:</strong> Giả lập các câu hỏi tình huống kinh doanh, kiểm tra tư duy logic và kiểm tra kiến thức SQL/Python trực tiếp.</li>
  <li><strong>Đánh giá năng lực 360 độ:</strong> Nhận nhận xét chi tiết về tác phong giao tiếp, tốc độ phản xạ và độ chính xác của câu trả lời kỹ thuật.</li>
  <li><strong>Xây dựng kế hoạch cải thiện cá nhân:</strong> Định hướng những chủ đề kiến thức cần củng cố thêm trước khi bước vào các kỳ tuyển dụng chính thức.</li>
</ul>
"""
}

def run_update():
    print("====================================================")
    print("STARTING LESSON CONTENT UPDATE FOR COURSE: XD")
    print("====================================================")
    
    supabase = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Fetch course ID for XD
    course_slug = "xd"
    courses = supabase.select("courses", {"slug": course_slug})
    if not courses:
        print(f"Error: Course with slug '{course_slug}' not found.")
        sys.exit(1)
    
    course_id = courses[0]["id"]
    print(f"Found Course 'X-Data (XD)' (ID: {course_id})")
    
    # 2. Fetch all modules for this course
    modules = supabase.select("modules", {"course_id": course_id})
    if not modules:
        print("Error: No modules found for this course.")
        sys.exit(1)
    
    module_ids = [m["id"] for m in modules]
    print(f"Found {len(module_ids)} modules.")
    
    # 3. Fetch lessons for these modules
    all_lessons = []
    for m_id in module_ids:
        lessons = supabase.select("lessons", {"module_id": m_id})
        all_lessons.extend(lessons)
        
    print(f"Found {len(all_lessons)} lessons total.")
    
    # Mapping of DB order_index to lesson folder numbers
    # Database order_index maps to folder numbers:
    # 1->1, 2->2, 3->3, 4->4, 5->5, 6->6, 7->7, 8->8, 9->9, 10->13, 11->14, 12->15
    reverse_order_mapping = {
        1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
        10: 13, 11: 14, 12: 15
    }
    
    updated_count = 0
    for lesson in all_lessons:
        db_order = lesson.get("order_index")
        lesson_num = reverse_order_mapping.get(db_order)
        
        if lesson_num and lesson_num in LESSON_CONTENTS:
            new_content = LESSON_CONTENTS[lesson_num].strip()
            print(f"Updating content for Lesson {lesson_num} (Title: '{lesson['title']}', DB Order: {db_order})...")
            supabase.update("lessons", lesson["id"], {"content": new_content})
            updated_count += 1
        else:
            print(f"Skipping lesson '{lesson['title']}' (DB Order: {db_order}, No mapping found).")
            
    print("====================================================")
    print(f"UPDATE COMPLETED SUCCESSFULLY! Updated {updated_count} lessons.")
    print("====================================================")

if __name__ == "__main__":
    run_update()
