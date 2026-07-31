'use client'
import { useState } from 'react'
import Image from 'next/image'
import { ImgComparisonSlider } from '@img-comparison-slider/react'
import Link from 'next/link'
import ProjectCard from './ProjectCard'
import { ArrowRight, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'
import { sanitizeHtml } from '@/lib/sanitize'
import type { ConsultingProject as ConsultingProjectData } from '@/lib/project-data'

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

interface ConsultingProjectProps {
  initialProjects: ConsultingProjectData[]
  initialErrorMessage: string | null
}

const ConsultingProject = ({ initialProjects, initialErrorMessage }: ConsultingProjectProps) => {
  const projects = initialProjects
  const [visibleProjects, setVisibleProjects] = useState(4)
  const errorMessage = initialErrorMessage
  const projectsPerLoad = 4
  const totalProjects = projects.length

  const handleShowMore = () => {
    setVisibleProjects((prev) =>
      Math.min(prev + projectsPerLoad, totalProjects)
    )
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2 className="section-title">Sản phẩm thực hiện cho khách hàng.</h2>
          <p className="section-subtitle">
            Sự nâng cấp mà tôi đã tạo ra cho khách hàng.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {totalProjects === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-sm text-slate-500">
            Chưa có dự án khách hàng được xuất bản.
          </div>
        )}

        {totalProjects > 0 && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {projects
            .slice(0, visibleProjects)
            .map(({ id, title, description, thumbnails, icons }) => (
              <ProjectCard key={id}>
                <div>
                  <Link href={`/projects/${id}`}>
                    <figure>
                      {thumbnails.length === 1 ? (
                        <Image
                          src={`${thumbnails[0]}`} // Dùng /files/ cho thumbnails
                          alt={title}
                          width={960}
                          height={540}
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="img-cover"
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
                            className="img-cover"
                          />
                          <Image
                            alt={title}
                            slot="second"
                            src={`${thumbnails[1]}`}
                            width={960}
                            height={540}
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="img-cover"
                          />
                        </ImgComparisonSlider>
                      )}
                    </figure>
                    <div className="p-8">
                      <h3 className="text-foreground text-xl font-medium mb-3">
                        {title}
                      </h3>
                      <div
                        className="text-muted-foreground line-clamp-4"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
                      />
                      <div className="flex items-center">
                        {icons.map((icon) => (
                          <div
                            key={icon}
                            className="lg:w-10 lg:h-10 w-8 h-8 flex justify-center items-center p-1"
                          >
                            <Image
                              src={resolveIconSrc(icon)}
                              alt=""
                              width={32}
                              height={32}
                              aria-hidden="true"
                            />
                          </div>
                        ))}
                      </div>
                      <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 group-hover:underline">
                        Xem ngay <ArrowRight aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </div>
              </ProjectCard>
            ))}
        </div>
        )}

        {visibleProjects < totalProjects && (
          <div className="mt-8 text-center">
            <Button
              onClick={handleShowMore}
              variant="outline"
              className="flex items-center gap-2 mx-auto"
            >
              Xem thêm <ArrowRight />
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}

export default ConsultingProject
