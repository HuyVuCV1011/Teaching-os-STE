'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { ImgComparisonSlider } from '@img-comparison-slider/react'
import Link from 'next/link'
import ProjectCard from './ProjectCard'
import { ArrowRight, X, FileText, Code, CheckCircle, ExternalLink } from 'lucide-react'
import { Button } from './ui/button'
import { sanitizeHtml } from '@/lib/sanitize'
import type { StudentShowcaseProject } from '@/lib/project-data'

const iconMap: { [key: string]: string } = {
  'power-bi': '/images/tools/power-bi.svg',
  excel: '/images/tools/excel.svg',
  python: '/images/tools/python.svg',
  powsvg: '/images/tools/power-bi.svg',
}

function resolveIconSrc(icon: string) {
  if (icon.startsWith('/')) return icon
  return iconMap[icon] || '/images/tools/python.svg'
}

interface StudentsProjectProps {
  initialProjects: StudentShowcaseProject[]
  initialErrorMessage: string | null
}

const StudentsProject = ({ initialProjects, initialErrorMessage }: StudentsProjectProps) => {
  const projects = initialProjects
  const [visibleProjects, setVisibleProjects] = useState(4)
  const [selectedSub, setSelectedSub] = useState<StudentShowcaseProject | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)
  const errorMessage = initialErrorMessage

  const projectsPerLoad = 4
  const totalProjects = projects.length

  const handleShowMore = () => {
    setVisibleProjects((prev) =>
      Math.min(prev + projectsPerLoad, totalProjects)
    )
  }

  useEffect(() => {
    if (!selectedSub) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedSub(null)
        return
      }

      if (event.key !== 'Tab') return
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      lastFocusedElementRef.current?.focus()
    }
  }, [selectedSub])

  const openSubmission = (project: StudentShowcaseProject) => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement | null
    setSelectedSub(project)
  }

  return (
    <section className="section bg-slate-955/20 py-20 border-t border-slate-700">
      <div className="container mx-auto px-4">
        <div className="section-head text-center max-w-2xl mx-auto mb-16 space-y-2">
          <h2 className="section-title text-3xl font-extrabold text-white">Sản phẩm của học viên</h2>
          <p className="section-subtitle text-slate-400 text-sm">
            Những đồ án và bài giải xuất sắc được tuyển chọn trực tiếp từ các khóa học thực chiến.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-8 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-600">
            {errorMessage}
          </div>
        )}

        {!errorMessage && totalProjects === 0 && (
          <div className="rounded-2xl border border-slate-700 bg-slate-950 p-8 text-center text-sm text-slate-500">
            Chưa có đồ án học viên được duyệt showcase.
          </div>
        )}

        {totalProjects > 0 && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {projects
            .slice(0, visibleProjects)
            .map((proj) => {
              const { id, title, description, thumbnails, icons, isSubmission, student_identifier, class_code } = proj
              return (
                <ProjectCard key={id}>
                  <div className="h-full flex flex-col justify-between">
                    <div>
                      {isSubmission ? (
                        <button
                          type="button"
                          onClick={() => openSubmission(proj)}
                          className="block w-full cursor-pointer border-0 bg-transparent p-0 text-left"
                        >
                          <figure className="relative overflow-hidden rounded-t-xl max-h-56">
                            <Image
                              src={thumbnails[0]}
                              alt={title}
                              width={960}
                              height={540}
                              sizes="(max-width: 768px) 100vw, 50vw"
                              className="img-cover object-cover w-full h-48 hover:scale-[1.02] transition-transform duration-300"
                            />
                            <span className="absolute top-3 right-3 bg-purple-600/90 text-white font-bold text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-purple-500/35 shadow-md">
                              Live Showcase
                            </span>
                          </figure>
                          <div className="p-8 space-y-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-mono">
                                Student: {student_identifier}
                              </span>
                              <span className="text-[9px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono">
                                Cohort: {class_code}
                              </span>
                            </div>
                            <h3 className="text-white text-xl font-medium hover:text-blue-500 transition-colors">
                              {title}
                            </h3>
                            <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed">
                              {description}
                            </p>
                          </div>
                        </button>
                      ) : (
                        <Link href={`/projects/${id}`}>
                          <figure className="relative overflow-hidden rounded-t-xl max-h-56">
                            {thumbnails.length === 1 ? (
                              <Image
                                src={`${thumbnails[0]}`}
                                alt={title}
                                width={960}
                                height={540}
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="img-cover object-cover w-full h-48 hover:scale-[1.02] transition-all duration-300"
                              />
                            ) : (
                              <ImgComparisonSlider hover={true} className="w-full">
                                <Image
                                  alt={title}
                                  slot="first"
                                  src={`${thumbnails[0]}`}
                                  width={960}
                                  height={540}
                                  sizes="(max-width: 768px) 100vw, 50vw"
                                  className="img-cover object-cover w-full h-48"
                                />
                                <Image
                                  alt={title}
                                  slot="second"
                                  src={`${thumbnails[1]}`}
                                  width={960}
                                  height={540}
                                  sizes="(max-width: 768px) 100vw, 50vw"
                                  className="img-cover object-cover w-full h-48"
                                />
                              </ImgComparisonSlider>
                            )}
                          </figure>
                          <div className="p-8 space-y-4">
                            <h3 className="text-white text-xl font-medium hover:text-blue-500 transition-colors">
                              {title}
                            </h3>
                            <div
                              className="text-slate-400 text-xs line-clamp-3 leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
                            />
                          </div>
                        </Link>
                      )}
                    </div>

                    <div className="px-8 pb-8 pt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {icons.map((icon) => (
                          <div
                            key={icon}
                            className="w-8 h-8 flex justify-center items-center p-1 bg-slate-900 border border-slate-700/50 rounded-lg"
                            title={icon}
                          >
                            <Image
                              src={resolveIconSrc(icon)}
                              alt=""
                              width={20}
                              height={20}
                              aria-hidden="true"
                              className="w-5 h-5"
                            />
                          </div>
                        ))}
                      </div>

                      {isSubmission ? (
                        <Button
                          onClick={() => openSubmission(proj)}
                          variant="link"
                          className="p-0 h-auto text-blue-500 font-bold hover:text-blue-400 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          Xem bài làm <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button asChild variant="link" className="p-0 h-auto text-blue-500 font-bold hover:text-blue-400 text-xs flex items-center gap-1 cursor-pointer">
                          <Link href={`/projects/${id}`}>
                            Xem ngay <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </ProjectCard>
              )
            })}
        </div>
        )}

        {visibleProjects < totalProjects && (
          <div className="mt-12 text-center">
            <Button
              onClick={handleShowMore}
              variant="outline"
              className="flex items-center gap-2 mx-auto border-slate-700 hover:bg-slate-900 hover:text-white"
            >
              Xem thêm <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Showcase Submission Modal Viewer */}
      {selectedSub && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-submission-title"
        >
          <div ref={dialogRef} className="bg-slate-955 border border-slate-700 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-xs overscroll-contain">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-700 bg-slate-955/95 flex justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <Code className="w-5 h-5 text-purple-500" />
                <div>
                  <h3 id="student-submission-title" className="font-bold text-white text-base leading-tight">Student Assignment Work</h3>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-semibold font-mono uppercase tracking-wider">
                    <span>{selectedSub.student_identifier}</span>
                    <span className="text-slate-650">•</span>
                    <span>Cohort: {selectedSub.class_code}</span>
                  </div>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setSelectedSub(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-455 hover:text-white transition-colors cursor-pointer"
                aria-label="Đóng bài làm học viên"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Project / Task Title</h4>
                <p className="text-slate-205 text-sm font-bold bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                  {selectedSub.title}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submission Notes & Answers</h4>
                <div className="bg-slate-955 border border-slate-800 p-4 rounded-xl text-slate-300 leading-relaxed font-mono whitespace-pre-wrap max-h-60 overflow-y-auto select-text selection:bg-blue-500/20 text-[11px]">
                  {selectedSub.description}
                </div>
              </div>

              {selectedSub.files && selectedSub.files.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submitted Deliverables</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedSub.files.map((file: string, index: number) => {
                      const filename = file.split('/').pop() || 'file'
                      const fileUrl = file
                      return (
                        <div
                          key={index}
                          className="p-3 rounded-xl border border-slate-700 bg-slate-900/30 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="text-slate-205 truncate font-medium max-w-[160px]" title={filename}>
                              {filename}
                            </span>
                          </div>
                          {/* Use standard storage path or download link (anon read policy recommended) */}
                          {fileUrl ? (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-350 hover:text-white flex items-center gap-1 transition-colors text-[10px] font-bold uppercase tracking-wider"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            </a>
                          ) : (
                            <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                              Chưa cấu hình URL
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-700 bg-slate-955 flex items-center justify-between text-slate-500 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                <CheckCircle className="w-3.5 h-3.5" />
                Verified Student Deliverable (Teaching OS STE)
              </span>
              <button
                type="button"
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-300 border border-slate-700 font-bold transition-all text-xs cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default StudentsProject
