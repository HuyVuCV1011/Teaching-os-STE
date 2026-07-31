import ConsultingProject from '@/components/ConsultingProject'
import { getConsultingProjects } from '@/lib/project-data'

export default async function ConsultingProjectSection() {
  const { projects, errorMessage } = await getConsultingProjects()

  return (
    <ConsultingProject
      initialProjects={projects}
      initialErrorMessage={errorMessage}
    />
  )
}
