import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WorkspaceList } from './routes/WorkspaceList'
import { WorkspaceSetup } from './routes/WorkspaceSetup'
import { WorkspaceDetail } from './routes/WorkspaceDetail'

// HashRouter (not BrowserRouter) because the renderer is loaded via file:// in
// production builds; URL-path routing breaks without a server. Hash routing
// works identically in dev and prod.
export function App(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/workspaces" replace />} />
        <Route path="/workspaces" element={<WorkspaceList />} />
        <Route path="/workspaces/new" element={<WorkspaceSetup />} />
        <Route path="/workspaces/:id" element={<WorkspaceDetail />} />
      </Routes>
    </HashRouter>
  )
}
