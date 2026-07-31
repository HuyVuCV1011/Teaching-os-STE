import StudentsProject from '@/components/StudentsProject'
import { getStudentShowcaseProjects } from '@/lib/project-data'

export default async function StudentsProjectSection() {
  const { projects, errorMessage } = await getStudentShowcaseProjects()

  return (
    <StudentsProject
      initialProjects={projects}
      initialErrorMessage={errorMessage}
    />
  )
}
