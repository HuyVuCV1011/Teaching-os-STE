import { Github, Twitter, Linkedin } from 'lucide-react'

export const navItems = [
  { name: 'Về tôi', link: '#about' },
  { name: 'Dự án', link: '/projects' },
  { name: 'Liên hệ', link: '#contact' },
  { name: 'Classroom', link: 'learn' },
  { name: 'Admin Hub', link: 'admin' },
]

export const projects = [
  {
    id: 'siren-reads-bookstore-management-system',
    title: 'Siren Reads: Hệ Thống Quản Lý & Tự Động Hóa Bookstore',
    desc: 'Hệ thống quản trị bán sách phân tán (Polyglot Persistence) kết hợp Java Spring Boot, React 19 và Docker. Hệ thống chia tách tải dữ liệu thông minh: PostgreSQL lưu giao dịch cốt lõi, MongoDB lưu catalog/bài viết, Cassandra lưu log sự kiện, Neo4j chạy mô hình gợi ý hành vi khách hàng, và Redis cache lượng truy cập cao.',
    thumbnails: ['/files/bao-cao-hoat-dong-kinh-doanh-cua-cua-hang-wmart.jpg'],
    files: [
      '/files/bao-cao-hoat-dong-kinh-doanh-cua-cua-hang-wmart.pdf',
      '/files/bao-cao-hoat-dong-kinh-doanh-cua-cua-hang-wmart.pdf',
    ],
    icons: ['/images/tools/power-bi.svg', '/images/tools/python.svg'],
  },
  {
    id: 'nyc-green-taxi-dwh-driver-operations-bi',
    title: 'NYC Green Taxi Data Warehouse & Driver Operations BI',
    desc: 'Hệ thống DWH chuẩn hóa dữ liệu vận hành từ MySQL, MongoDB và file batch TLC Trips (19 tháng). Pipeline Python ETL tự động hóa kiểm soát chất lượng dữ liệu (Data Quality Gate), thiết lập Star Schema (NDS/DDS). Đồng thời, tích hợp mô hình phân khúc tài xế (K-Means Clustering) và biểu diễn báo cáo động qua Apache Superset & Streamlit Control Panel.',
    thumbnails: [
      '/files/bao-cao-hoat-dong-kinh-doanh-thuong-mai-dien-tu-olist-brazil.jpg',
      '/files/bao-cao-hoat-dong-kinh-doanh-thuong-mai-dien-tu-olist-brazil.jpg',
    ],
    files: [
      '/files/bao-cao-hoat-dong-kinh-doanh-thuong-mai-dien-tu-olist-brazil.pdf',
      '/files/bao-cao-hoat-dong-kinh-doanh-thuong-mai-dien-tu-olist-brazil.pdf',
    ],
    icons: ['/images/tools/power-bi.svg', '/images/tools/excel.svg'],
  },
  {
    id: 'he-thong-du-lieu-ban-le-crm-da-kenh',
    title: 'Hệ Thống Dữ Liệu Bán Lẻ & CRM Đa Kênh',
    desc: 'Tự động hóa luồng dữ liệu chăm sóc khách hàng đa kênh (Lazada, Shopee, Tiki, Facebook). Pipeline Python thu thập dữ liệu tự động hàng ngày lúc 2h sáng, nạp dữ liệu sạch vào Database Postgres tập trung, tự động cập nhật Dashboard doanh thu Power BI và gửi cảnh báo qua Email/Telegram cho các phòng ban.',
    thumbnails: ['/files/bao-cao-phan-tich-kinh-doanh-sach-tiki.jpg'],
    files: ['/files/bao-cao-phan-tich-kinh-doanh-sach-tiki.pdf'],
    icons: [
      '/images/tools/power-bi.svg',
      '/images/tools/python.svg',
      '/images/tools/sql.svg',
    ],
  },
  {
    id: 'phan-tich-ung-dung-fintech',
    title: 'Phân tích Ứng dụng Fintech - The Money Matters Series',
    desc: 'Dự án phân tích hành vi người dùng trong ngày đầu sử dụng ứng dụng Fintech nhằm nâng cao quản lý tài chính cá nhân và giảm tỷ lệ rời bỏ. Trực quan hóa tiến trình đăng ký và tương tác mini-game qua dashboard doanh thu.',
    thumbnails: ['/files/phan-tich-ung-dung-fintech.jpg'],
    files: ['/files/phan-tich-ung-dung-fintech.pdf'],
    icons: ['/images/tools/python.svg', '/images/tools/power-bi.svg'],
  },
]

export const workExperience = [
  {
    id: 1,
    title: 'Giảng dạy & Ứng dụng Data',
    desc: 'Đào tạo chuyên sâu SQL, Python, Power BI ứng dụng thực tế cho hơn 500+ học viên tại MindX & STE, đồng thời hỗ trợ phát triển giáo án dựa trên phân tích điểm số.',
    className: 'md:col-span-2',
    thumbnail: '/images/teaching.png',
  },
  {
    id: 2,
    title: 'Tư vấn & Triển khai Giải pháp Data',
    desc: 'Xây dựng kiến trúc dữ liệu đa mô hình (Polyglot) như Siren Reads, DWH Green Taxi chuẩn doanh nghiệp, tối ưu hóa và trực quan dữ liệu lớn.',
    className: 'md:col-span-2',
    thumbnail: '/images/solution.png',
  },
  {
    id: 3,
    title: 'Quản lý & Tối ưu Hệ thống & Quy trình',
    desc: 'Thiết kế pipeline tự động hóa báo cáo kinh doanh bán lẻ/CRM, loại bỏ thao tác Excel thủ công rời rạc, giúp tối ưu hóa 85% thời gian vận hành.',
    className: 'md:col-span-2',
    thumbnail: '/images/optimization.png',
  },
  {
    id: 4,
    title: 'Cố vấn & Phát triển Hệ thống Giáo dục',
    desc: 'Nghiên cứu phát triển mô hình Machine Learning định lượng chứng khoán và áp dụng các thuật toán phân khúc học viên theo hiệu suất học tập.',
    className: 'md:col-span-2',
    thumbnail: '/images/adviser.png',
  },
]

export const socialMedia = [
  {
    id: 1,
    link: '',
    label: 'GitHub',
    icon: Github,
  },
  {
    id: 2,
    link: '',
    label: 'Twitter',
    icon: Twitter,
  },
  {
    id: 3,
    link: '',
    label: 'LinkedIn',
    icon: Linkedin,
  },
]
