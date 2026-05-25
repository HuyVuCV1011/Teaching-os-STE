'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Trash2, Edit, Plus } from 'lucide-react'

interface FlowNode {
  id: string
  type: string
  label: string
  description: string
  icon: string
  position: { x: number; y: number }
}

interface FlowEdge {
  source: string
  target: string
  markerEnd: { type: string }
  style: { strokeWidth: number }
}

interface Project {
  id: string
  title: string
  description: string | null
  product_option: string | null
  thumbnails: string[] | null
  files: string[] | null
  icons: string[] | null
  flow_diagram: { nodes: FlowNode[]; edges: FlowEdge[] } | null
}

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch student projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.from('projects').select('*')
        if (error) {
          console.error('Supabase fetch error:', error)
          throw new Error(`Không thể tải dự án: ${error.message}`)
        }
        setProjects(data || [])
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Lỗi không xác định'
        console.error('Fetch error:', message)
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  // Delete project and associated files
  const handleDelete = async (
    projectId: string,
    thumbnails: string[] | null,
    files: string[] | null
  ) => {
    if (!confirm('Bạn có chắc muốn xóa dự án này?')) return

    try {
      // Delete storage files
      const deleteStorageFiles = async (bucket: string, paths: string[]) => {
        if (paths && paths.length > 0) {
          const fileNames = paths.map((url) => {
            const parts = url.split('/')
            return parts.slice(-2).join('/')
          })
          const { error } = await supabase.storage
            .from(bucket)
            .remove(fileNames)
          if (error) {
            console.error(`Supabase storage delete error (${bucket}):`, error)
            throw new Error(`Không thể xóa tệp trong ${bucket}`)
          }
        }
      }

      await deleteStorageFiles('thumbnails', thumbnails || [])
      await deleteStorageFiles('files', files || [])

      // Delete project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
      if (error) {
        console.error('Supabase delete error:', error)
        throw new Error(`Không thể xóa dự án: ${error.message}`)
      }

      setProjects(projects.filter((project) => project.id !== projectId))
      alert('Dự án đã được xóa thành công')
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Lỗi không xác định'
      console.error('Delete error:', message)
      alert(`Xóa thất bại: ${message}`)
    }
  }

  if (loading) {
    return <div className="container py-10">Đang tải...</div>
  }

  if (error) {
    return <div className="container py-10 text-red-500">Lỗi: {error}</div>
  }

  return (
    <div className="container py-10 md-py-16 mt-28">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Quản lý Dự Án</h1>
        <Link href="/projects/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Thêm Dự Án
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-500">Không có dự án nào.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left">Tiêu đề</th>
                <th className="py-2 px-4 border-b text-left">Mô tả</th>
                <th className="py-2 px-4 border-b text-left">
                  Tùy chọn Sản phẩm
                </th>
                <th className="py-2 px-4 border-b text-left">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{project.title}</td>
                  <td className="py-2 px-4 border-b">
                    {project.description
                      ? project.description.length > 100
                        ? `${project.description.slice(0, 100)}...`
                        : project.description
                      : 'Không có mô tả'}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {project.product_option}
                  </td>
                  <td className="py-2 px-4 border-b flex gap-2">
                    <Link href={`/projects/edit/${project.id}`}>
                      <Button variant="outline" size="icon" title="Chỉnh sửa">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      size="icon"
                      title="Xóa"
                      onClick={() =>
                        handleDelete(
                          project.id,
                          project.thumbnails,
                          project.files
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ProjectsPage
