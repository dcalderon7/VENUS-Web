import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute'
import { CatalogPage } from './pages/CatalogPage'
import { DashboardPage } from './pages/DashboardPage'
import { LibraryPage } from './pages/LibraryPage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SharedPage } from './pages/SharedPage'
import { UsersPage } from './pages/UsersPage'
import { WatchPartyPage } from './pages/WatchPartyPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/catalog" replace />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/shared" element={<SharedPage />} />
          <Route path="/watch-party" element={<WatchPartyPage />} />

          {/* Admin protected routes */}
          <Route element={<AdminRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/media" element={<PlaceholderPage type="media" />} />
            <Route path="/activity" element={<PlaceholderPage type="activity" />} />
            <Route path="/settings" element={<PlaceholderPage type="settings" />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/catalog" replace />} />
    </Routes>
  )
}
