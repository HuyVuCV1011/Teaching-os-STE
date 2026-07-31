import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, BarChart3, Database, GraduationCap, Workflow } from 'lucide-react'

import { getConsultingProjects, stripHtml } from '@/lib/project-data'

export const metadata: Metadata = {
  title: 'Dự án dữ liệu & Teaching OS',
  description:
    'Danh mục case study về dữ liệu, BI, automation và hệ thống học tập của STE Workspace.',
  alternates: { canonical: '/projects' },
}

const projectKeywords = [
  'Data warehouse',
  'Power BI',
  'Python ETL',
  'CRM automation',
  'Polyglot persistence',
  'Learning analytics',
]

function getProjectType(title: string, description: string) {
  const text = `${title} ${stripHtml(description)}`.toLowerCase()
  if (text.includes('bookstore') || text.includes('polyglot')) return 'Polyglot system'
  if (text.includes('warehouse') || text.includes('dwh')) return 'Warehouse & BI'
  if (text.includes('crm') || text.includes('đa kênh')) return 'CRM automation'
  if (text.includes('fintech')) return 'Fintech analytics'
  if (text.includes('thương mại điện tử') || text.includes('ecommerce')) return 'E-commerce analytics'
  return 'Business intelligence'
}

function resolveIconSrc(icon: string) {
  if (icon.startsWith('/')) return icon
  const iconMap: Record<string, string> = {
    'power-bi': '/images/tools/power-bi.svg',
    powsvg: '/images/tools/power-bi.svg',
    excel: '/images/tools/excel.svg',
    python: '/images/tools/python.svg',
    sql: '/images/tools/sql.svg',
  }
  return iconMap[icon] || '/images/tools/python.svg'
}

export default async function ProjectsPage() {
  const { projects } = await getConsultingProjects()
  const projectSignals = [
    { label: 'Data systems', value: `${projects.length} case studies`, icon: Database },
    { label: 'Teaching OS', value: 'Portfolio-ready', icon: GraduationCap },
    { label: 'BI automation', value: 'Ops focused', icon: BarChart3 },
  ]

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <section className="relative overflow-hidden border-b border-slate-800/10 bg-slate-950">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="container relative py-24 md:py-32">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-800/20 bg-slate-900/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 transition-all duration-500 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] hover:border-blue-600/40 hover:text-blue-700 active:scale-[0.98]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Về portfolio
          </Link>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-end">
            <div>
              <p className="inline-flex rounded-full border border-blue-600/20 bg-blue-600/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-blue-700">
                Project registry
              </p>
              <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-[-0.05em] text-slate-100 md:text-6xl lg:text-7xl">
                Dự án dữ liệu, BI và hệ thống vận hành học tập.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500 md:text-lg">
                Một trang riêng cho các case study tiêu biểu: từ kiến trúc dữ liệu đa
                mô hình, data warehouse, dashboard vận hành cho tới automation phục vụ
                lớp học và tư vấn dữ liệu.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-800/10 bg-slate-900/10 p-1.5 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
              <div className="rounded-[calc(2rem-0.375rem)] border border-slate-800/10 bg-slate-950 p-6">
                <div className="flex items-center gap-3 border-b border-slate-800/10 pb-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                    <Workflow className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-100">Case study map</p>
                    <p className="text-xs leading-5 text-slate-500">
                      Những lát cắt tốt nhất cho nhà tuyển dụng, khách hàng và học viên.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {projectSignals.map((signal) => {
                    const Icon = signal.icon
                    return (
                      <div
                        key={signal.label}
                        className="flex items-center justify-between rounded-2xl border border-slate-800/10 bg-slate-900/10 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-blue-700" aria-hidden="true" />
                          <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            {signal.label}
                          </span>
                        </div>
                        <span className="text-sm font-black text-slate-100">{signal.value}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20 md:py-28">
        <div className="container">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">
                Selected work
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-100 md:text-5xl">
                Case studies đang nổi bật
              </h2>
            </div>
            <div className="flex max-w-xl flex-wrap gap-2">
              {projectKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-slate-800/10 bg-slate-900/10 px-3 py-1 text-xs font-semibold text-slate-500"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {projects.map((project, index) => {
              const thumbnail = project.thumbnails?.[0]
              const featured = index === 0

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={`group rounded-[2rem] border border-slate-800/10 bg-slate-900/10 p-1.5 transition-all duration-700 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-blue-600/20 hover:shadow-[0_28px_90px_rgba(37,99,235,0.10)] active:scale-[0.99] ${
                    featured ? 'lg:col-span-2' : ''
                  }`}
                >
                  <article
                    className={`grid h-full overflow-hidden rounded-[calc(2rem-0.375rem)] border border-slate-800/10 bg-slate-950 ${
                      featured ? 'md:grid-cols-[1.08fr_0.92fr]' : ''
                    }`}
                  >
                    <div className={`relative min-h-[260px] overflow-hidden ${featured ? 'md:min-h-[420px]' : ''}`}>
                      {thumbnail ? (
                        <Image
                          src={thumbnail}
                          alt={project.title}
                          fill
                          className="object-cover transition-transform duration-700 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]"
                          sizes={featured ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 45vw, 100vw'}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-slate-900/20">
                          <Database className="h-12 w-12 text-slate-600" aria-hidden="true" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                      <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
                        {getProjectType(project.title, project.description)}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between p-6 md:p-8">
                      <div>
                        <div className="flex items-center gap-2">
                          {(project.icons || []).slice(0, 4).map((icon) => (
                            <span
                              key={icon}
                              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-800/10 bg-slate-900/10"
                            >
                              <Image
                                src={resolveIconSrc(icon)}
                                alt=""
                                width={18}
                                height={18}
                                className="h-4.5 w-4.5"
                              />
                            </span>
                          ))}
                        </div>
                        <h3 className="mt-6 text-2xl font-black tracking-[-0.035em] text-slate-100 md:text-3xl">
                          {project.title}
                        </h3>
                        <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-500">
                          {stripHtml(project.description)}
                        </p>
                      </div>

                      <div className="mt-8 flex items-center justify-between border-t border-slate-800/10 pt-5">
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                          Xem case study
                        </span>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition-transform duration-500 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-0.5">
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
