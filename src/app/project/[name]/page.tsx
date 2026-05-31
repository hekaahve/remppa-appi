import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getProjects, getExpenses } from '@/lib/sheets'
import ProjectView from '@/components/ProjectView'

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { name } = await params
  const projectName = decodeURIComponent(name)

  const [projects, expenses] = await Promise.all([
    getProjects(),
    projectName === 'start' ? Promise.resolve([]) : getExpenses(projectName),
  ])

  return (
    <ProjectView
      projects={projects}
      activeProject={projectName}
      expenses={expenses}
      userEmail={session.user?.email ?? ''}
    />
  )
}
