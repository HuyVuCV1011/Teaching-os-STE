'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ImgComparisonSlider } from '@img-comparison-slider/react'
import Link from 'next/link'
import ProjectCard from './ProjectCard'
import { ArrowRight } from 'lucide-react'
import { Button } from './ui/button'

interface Project {
  id: string
  title: string
  description: string
  thumbnails: string[]
  files: string[]
  icons: string[]
}

const iconMap: { [key: string]: string } = {
  'power-bi': '/images/tools/power-bi.svg',
  excel: '/images/tools/excel.svg',
  python: '/images/tools/python.svg',
  powsvg: '/images/tools/powsvg',
}

const StudentsProject = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [visibleProjects, setVisibleProjects] = useState(4)
  const projectsPerLoad = 4
  const totalProjects = projects.length

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('product_option', 'student')
      if (error) {
        console.error('Error fetching projects:', error)
      } else {
        setProjects(data)
      }
    }
    fetchProjects()
  }, [])

  const handleShowMore = () => {
    setVisibleProjects((prev) =>
      Math.min(prev + projectsPerLoad, totalProjects)
    )
  }

  return (
    <section className="section" id="projects">
      <div className="container">
        <div className="section-head">
          <h2 className="section-title">Sản phẩm của học viên.</h2>
          <p className="section-subtitle">
            Những gì học viên đã làm được sau khi học.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {projects
            .slice(0, visibleProjects)
            .map(({ id, title, description, thumbnails, icons }) => (
              <ProjectCard key={id}>
                <div>
                  <Link href={`/projects/${id}`}>
                    <figure>
                      {thumbnails.length === 1 ? (
                        <img
                          src={`${thumbnails[0]}`} // Dùng /files/ cho thumbnails
                          alt={title}
                          className="img-cover"
                        />
                      ) : (
                        <ImgComparisonSlider hover={true} className="w-full">
                          <img
                            alt={title}
                            slot="first"
                            src={`${thumbnails[0]}`}
                            className="img-cover"
                          />
                          <img
                            alt={title}
                            slot="second"
                            src={`${thumbnails[1]}`}
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
                        dangerouslySetInnerHTML={{ __html: description }}
                      />
                      <div className="flex items-center">
                        {icons.map((icon) => (
                          <div
                            key={icon}
                            className="lg:w-10 lg:h-10 w-8 h-8 flex justify-center items-center p-1"
                          >
                            <img src={iconMap[icon]} alt={icon} />
                          </div>
                        ))}
                      </div>
                      <div>
                        <Button variant="link" className="p-0 h-auto mt-3">
                          Xem ngay <ArrowRight />
                        </Button>
                      </div>
                    </div>
                  </Link>
                </div>
              </ProjectCard>
            ))}
        </div>

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

export default StudentsProject
