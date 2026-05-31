import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getProjects } from '@/lib/sheets'

export default async function Home() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const projects = await getProjects()

  if (projects.length > 0) {
    redirect(`/project/${encodeURIComponent(projects[0].name)}`)
  }

  // No projects yet — show empty state
  redirect('/project/start')
}
