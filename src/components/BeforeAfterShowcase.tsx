'use client'

import React, { useState } from 'react'
import { ImgComparisonSlider } from '@img-comparison-slider/react'
import { ArrowRight, CheckCircle2, TrendingUp, Sparkles, Clock, AlertTriangle, Cpu } from 'lucide-react'

const BeforeAfterShowcase = () => {
  const [activeTab, setActiveTab] = useState<'retail' | 'stock'>('retail')

  return (
    <section className="section bg-slate-900/10 py-20 border-t border-slate-850">
      <div className="container mx-auto px-4">
        
        {/* Section Header */}
        <div className="section-head text-center max-w-2xl mx-auto mb-16 space-y-2">
          <h2 className="section-title text-3xl font-extrabold text-slate-50">
            Hiệu Quả Tối Ưu Thực Tế
          </h2>
          <p className="section-subtitle text-slate-550 text-sm font-semibold max-w-md mx-auto normal-case">
            Trực quan sự khác biệt trước và sau khi triển khai các quy trình tự động hóa, giải phóng vận hành doanh nghiệp.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex justify-center gap-3 mb-12">
          <button
            onClick={() => setActiveTab('retail')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
              activeTab === 'retail'
                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/15'
                : 'bg-slate-955 border-slate-800 text-slate-550 hover:text-slate-100 hover:border-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Hệ Thống Dữ Liệu Bán Lẻ & CRM (Power BI)</span>
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/15'
                : 'bg-slate-955 border-slate-800 text-slate-550 hover:text-slate-100 hover:border-slate-700'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Pipeline Cấp Dữ Liệu Model Chứng Khoán (Python)</span>
          </button>
        </div>

        {/* Showcase Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-5xl mx-auto items-center">
          
          {/* Left Side: Business case information */}
          <div className="lg:col-span-5 space-y-6">
            {activeTab === 'retail' ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-blue-500 font-semibold text-xs uppercase tracking-widest">
                  <Sparkles className="w-4 h-4" />
                  <span>Case Study 1</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-50 leading-tight">
                  Tối ưu hóa Báo cáo Doanh thu Bán lẻ & CRM đa kênh
                </h3>
                <p className="text-slate-550 text-sm leading-relaxed">
                  Đồng bộ dữ liệu bán hàng đa kênh từ các sàn thương mại điện tử và fanpage chăm sóc khách hàng, loại bỏ quy trình tổng hợp báo cáo bằng tay cồng kềnh.
                </p>
                <div className="space-y-3.5 pt-2">
                  <div className="flex items-start gap-2.5 text-xs text-slate-550">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span><strong>Trước khi tối ưu:</strong> Xuất file báo cáo thủ công hàng ngày từ Lazada, Shopee, Tiki; nhân viên mất 4-5 tiếng ghép file, thường xuyên sai số.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-550">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Sau khi tối ưu:</strong> Tự động hóa 100% luồng dữ liệu. Dashboard Power BI cập nhật doanh thu, tồn kho và hiệu suất chăm sóc khách hàng tức thời, tự động gửi báo cáo mỗi sáng.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-500 font-semibold text-xs uppercase tracking-widest">
                  <Sparkles className="w-4 h-4" />
                  <span>Case Study 2</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-50 leading-tight">
                  Pipeline Nạp Dữ Liệu Sạch Cho Model ML Chứng Khoán
                </h3>
                <p className="text-slate-550 text-sm leading-relaxed">
                  Thiết lập pipeline tự động thu thập và xử lý các chỉ số tài chính, lịch sử giá cổ phiếu để làm đầu vào (input) đạt chuẩn cho các mô hình định lượng chứng khoán.
                </p>
                <div className="space-y-3.5 pt-2">
                  <div className="flex items-start gap-2.5 text-xs text-slate-550">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span><strong>Trước khi tối ưu:</strong> Tải file lịch sử giá từ nhiều trang tài chính, lọc tay các dòng lỗi dữ liệu, cấu trúc thư mục lộn xộn khiến model chạy thiếu chính xác.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-550">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Sau khi tối ưu:</strong> Bộ script Python crawl tự động lúc 2h sáng, lọc nhiễu dữ liệu thô qua Data Quality Gate, nạp thẳng vào PostgreSQL DWH, đảm bảo dữ liệu đầu vào luôn nhất quán.</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-800/80">
              <a
                href="#projects"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors"
              >
                <span>Xem chi tiết danh sách dự án</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Side: Slider Image Comparison */}
          <div className="lg:col-span-7">
            <div className="border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl bg-slate-900/40 p-1">
              <div className="relative rounded-xl overflow-hidden aspect-[16/10] bg-slate-955 flex items-center justify-center">
                
                {/* Before/After Tag Indicators */}
                <div className="absolute top-3 left-3 z-10 bg-slate-900/80 border border-slate-800/80 px-2 py-0.5 rounded text-[8px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none select-none">
                  Trước (Thủ công / Rời rạc)
                </div>
                <div className="absolute top-3 right-3 z-10 bg-blue-600/90 px-2 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-widest pointer-events-none select-none">
                  Sau (Tự động hóa STE)
                </div>

                {activeTab === 'retail' ? (
                  <ImgComparisonSlider hover={true} className="w-full h-full cursor-ew-resize">
                    <img
                      slot="first"
                      src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
                      alt="Trước tối ưu: Bảng Excel thủ công rời rạc"
                      className="w-full h-full object-cover aspect-[16/10] filter grayscale contrast-125 opacity-70"
                    />
                    <img
                      slot="second"
                      src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80"
                      alt="Sau tối ưu: Dashboard Power BI chuyên nghiệp"
                      className="w-full h-full object-cover aspect-[16/10]"
                    />
                  </ImgComparisonSlider>
                ) : (
                  <ImgComparisonSlider hover={true} className="w-full h-full cursor-ew-resize">
                    <img
                      slot="first"
                      src="https://images.unsplash.com/photo-1543286386-7a3950385cc9?auto=format&fit=crop&w=800&q=80"
                      alt="Trước tối ưu: Tổng hợp dữ liệu tay"
                      className="w-full h-full object-cover aspect-[16/10] filter grayscale contrast-125 opacity-70"
                    />
                    <img
                      slot="second"
                      src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80"
                      alt="Sau tối ưu: Pipeline dữ liệu tự động"
                      className="w-full h-full object-cover aspect-[16/10]"
                    />
                  </ImgComparisonSlider>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}

export default BeforeAfterShowcase
