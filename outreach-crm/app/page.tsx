import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import CRMShell from '@/components/CRMShell'

export default async function Home() {
  const session = await auth()
  if (!session) redirect('/login')
  return <CRMShell user={session.user!} />
}
