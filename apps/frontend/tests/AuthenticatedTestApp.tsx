import { AuthenticatedApp } from '@/App'
import { CURRENT_USER } from '@/data/users'

/** Feature suites exercise the authenticated workspace; Auth.spec covers login. */
export default function AuthenticatedTestApp() {
  return <AuthenticatedApp user={CURRENT_USER} onLogout={() => {}} initialPage="arbeitsblaetter" />
}
