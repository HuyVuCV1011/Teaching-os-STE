import { Github } from 'lucide-react'
import { Twitter } from 'lucide-react'
import { Linkedin } from 'lucide-react'
export const navItems = [
  { name: 'Về tôi', link: '#about' },
  { name: 'Dự án', link: '#projects' },
  { name: 'Liên hệ', link: '#contact' },
]

export const projects = [
  {
    id: 'bao-cao-hoat-dong-kinh-doanh-cua-cua-hang-wmart',
    title: 'Báo cáo hoạt động kinh doanh của cửa hàng Wmart',
    desc: 'Dự án phân tích hoạt động kinh doanh của cửa hàng Wmart nhằm đánh giá doanh thu, chi phí, lợi nhuận và hàng hủy. Mục tiêu là xác định nguyên nhân doanh thu không đạt chỉ tiêu, lợi nhuận giảm, đồng thời đề xuất giải pháp tối ưu chi phí, thúc đẩy khuyến mãi và kiểm soát hàng tồn. Nội dung chính bao gồm phân tích dữ liệu, báo cáo tài chính, đánh giá đối thủ và tiềm năng khu vực.',
    thumbnails: ['/files/bao-cao-hoat-dong-kinh-doanh-cua-cua-hang-wmart.jpg'],
    files: [
      '/files/bao-cao-hoat-dong-kinh-doanh-cua-cua-hang-wmart.pdf',
      '/files/bao-cao-hoat-dong-kinh-doanh-cua-cua-hang-wmart.pdf',
    ],
    icons: ['/images/tools/power-bi.svg', '/images/tools/python.svg'],
  },
  {
    id: 'bao-cao-hoat-dong-kinh-doanh-thuong-mai-dien-tu-olist-brazil',
    title: 'Báo cáo hoạt động kinh doanh thương mại điện tử Olist Brazil',
    desc: 'Dự án phân tích hoạt động kinh doanh thương mại điện tử Olist Brazil nhằm đánh giá doanh thu, hành vi khách hàng và hiệu quả giao hàng. Mục tiêu là xác định sản phẩm bán chạy, khu vực đặt hàng nhiều nhất, cải thiện logistics và tăng trưởng doanh thu gấp đôi trong 2 năm. Nội dung chính bao gồm phân tích dữ liệu, xu hướng thị trường và hiệu suất giao hàng.',
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
    id: 'bao-cao-phan-tich-kinh-doanh-sach-tiki',
    title: 'Báo cáo phân tích kinh doanh sách Tiki',
    desc: 'Dự án phân tích dữ liệu sách Tiki nhằm đánh giá doanh thu, thị phần sách và hành vi khách hàng so với Shopee, Lazada. Mục tiêu là xác định sách bán chạy, yếu tố ảnh hưởng đến quyết định mua (giá, nhà xuất bản, review), đồng thời đề xuất giải pháp tăng doanh thu và giữ thị phần sách. Nội dung chính bao gồm phân tích đối thủ, dữ liệu bán hàng và đánh giá khách hàng.',
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
    desc: 'Dự án phân tích dữ liệu ứng dụng fintech nhằm nâng cao quản lý tài chính cá nhân, hỗ trợ thanh toán nhanh và giảm lo ngại tài chính. Sử dụng công nghệ tiên tiến và big data, dự án tập trung vào hành vi người dùng trong ngày đầu sử dụng, bao gồm lượt truy cập màn hình và tương tác mini-game tài chính, để tối ưu giải pháp tài chính số toàn diện, an toàn và minh bạch. Kết quả bao gồm dashboard tổng quan, phân tích khách hàng đăng ký và tỷ lệ rời bỏ.',
    thumbnails: ['/files/phan-tich-ung-dung-fintech.jpg'],
    files: ['/files/phan-tich-ung-dung-fintech.pdf'],
    icons: ['/images/tools/python.svg', '/images/tools/power-bi.svg'],
  },
]

export const workExperience = [
  {
    id: 1,
    title: 'Giảng dạy & Ứng dụng Data',
    desc: 'Hướng dẫn khai thác, phân tích và ứng dụng dữ liệu để ra quyết định hiệu quả trong nhiều lĩnh vực.',
    className: 'md:col-span-2',
    thumbnail: '/images/teaching.png',
  },
  {
    id: 2,
    title: 'Tư vấn & Triển khai Giải pháp Data',
    desc: 'Xây dựng mô hình phân tích, tối ưu hóa và khai thác dữ liệu nhằm nâng cao hiệu suất doanh nghiệp.',
    className: 'md:col-span-2', // change to md:col-span-2
    thumbnail: '/images/solution.png',
  },
  {
    id: 3,
    title: 'Quản lý & Tối ưu Hệ thống & Quy trình',
    desc: 'Thiết kế, tinh chỉnh quy trình làm việc và xử lý dữ liệu để tự động hóa và tối ưu vận hành.',
    className: 'md:col-span-2', // change to md:col-span-2
    thumbnail: '/images/optimization.png',
  },
  {
    id: 4,
    title: 'Cố vấn & Phát triển Hệ thống Giáo dục',
    desc: 'Xây dựng, cải tiến hệ thống đào tạo và quản lý giáo viên theo mô hình dữ liệu và hiệu suất.',
    className: 'md:col-span-2',
    thumbnail: '/images/adviser.png',
  },
]

export const socialMedia = [
  {
    id: 1,
    link: '',
    icon: Github,
  },
  {
    id: 2,
    link: '',
    icon: Twitter,
  },
  {
    id: 3,
    link: '',
    icon: Linkedin,
  },
]
