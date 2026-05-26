'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Trash2, Edit, Plus, Briefcase, HelpCircle, Loader2 } from 'lucide-react'

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

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('projects').select('*')
      if (error) {
        throw new Error(error.message)
      }
      setProjects(data || [])
    } catch (err: any) {
      console.error('Fetch error:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (
    projectId: string,
    thumbnails: string[] | null,
    files: string[] | null
  ) => {
    if (!confirm('Are you sure you want to delete this project? All associated media files will be removed.')) return

    try {
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
            console.error(`Storage delete error (${bucket}):`, error)
          }
        }
      }

      await deleteStorageFiles('thumbnails', thumbnails || [])
      await deleteStorageFiles('files', files || [])

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error

      setProjects(projects.filter((p) => p.id !== projectId))
      alert('Project deleted successfully')
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`)
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Briefcase className="w-8 h-8 text-blue-600" />
            Projects CMS Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">Configure showcase data pipeline projects, upload details, and map icons.</p>
        </div>
        <Link href="/admin/projects/create">
          <span className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Create Project
          </span>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-400 text-sm gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span>Retrieving showcase registry...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12 border border-dashed border-rose-500/20 rounded-xl text-rose-450 text-sm">
          Failed to load projects: {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="h-full border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center py-24 text-slate-500 text-sm gap-2">
          <HelpCircle className="w-8 h-8 text-slate-600" />
          <span>No projects found. Click "Create Project" to publish your first showcase item.</span>
        </div>
      ) : (
        <div className="border border-slate-800 bg-slate-900/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800/80">
              <thead className="bg-slate-900/60 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6 text-left">Project Title</th>
                  <th className="py-4 px-6 text-left">Description</th>
                  <th className="py-4 px-6 text-left">Option</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 bg-slate-950/20 text-sm">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 px-6 font-semibold text-white max-w-xs truncate">
                      {project.title}
                    </td>
                    <td className="py-4 px-6 text-slate-400 max-w-md truncate">
                      {project.description
                        ? project.description.replace(/<[^>]*>/g, '')
                        : 'No description provided.'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        project.product_option === 'customer'
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-600'
                          : 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                      }`}>
                        {project.product_option}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right flex justify-end gap-2.5">
                      <Link href={`/admin/projects/edit/${project.id}`}>
                        <span className="p-2 rounded-lg bg-slate-900 border border-slate-500 hover:border-slate-400 text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer" title="Edit Metadata">
                          <Edit className="w-4 h-4" />
                        </span>
                      </Link>
                      <button
                        onClick={() =>
                          handleDelete(
                            project.id,
                            project.thumbnails,
                            project.files
                          )
                        }
                        className="p-2 rounded-lg bg-slate-900 border border-slate-500 hover:border-rose-900/30 hover:bg-rose-950/10 text-slate-500 hover:text-rose-450 transition-all flex items-center justify-center"
                        title="Remove Showcase"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
