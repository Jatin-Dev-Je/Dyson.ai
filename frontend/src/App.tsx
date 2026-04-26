import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import Landing        from '@/pages/Landing'
import NotFound       from '@/pages/NotFound'
import Login          from '@/pages/auth/Login'
import Signup         from '@/pages/auth/Signup'
import Onboarding     from '@/pages/onboarding/Onboarding'
import AppShell       from '@/components/layout/AppShell'
import Dashboard      from '@/pages/app/Dashboard'
import WhyEngine      from '@/pages/app/WhyEngine'
import DecisionLog    from '@/pages/app/DecisionLog'
import OnboardingPacks from '@/pages/app/onboarding-packs/OnboardingPacks'
import PackDetail     from '@/pages/app/onboarding-packs/PackDetail'
import GlobalSearch   from '@/pages/app/GlobalSearch'
import SettingsLayout from '@/pages/settings/SettingsLayout'
import Profile        from '@/pages/settings/Profile'
import Workspace      from '@/pages/settings/Workspace'
import ConnectedSources from '@/pages/settings/ConnectedSources'
import TeamMembers    from '@/pages/settings/TeamMembers'
import Billing        from '@/pages/settings/Billing'
import Notifications  from '@/pages/settings/Notifications'
import ApiKeys        from '@/pages/settings/ApiKeys'
import AuditLog       from '@/pages/settings/AuditLog'
import Security       from '@/pages/settings/Security'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/"       element={<Landing />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login"  element={<Login />} />

          {/* Onboarding — protected but separate shell */}
          <Route path="/onboarding" element={
            <ProtectedRoute><Onboarding /></ProtectedRoute>
          } />

          {/* App */}
          <Route path="/app" element={
            <ProtectedRoute><AppShell /></ProtectedRoute>
          }>
            <Route index                   element={<Dashboard />} />
            <Route path="dashboard"        element={<Dashboard />} />
            <Route path="why"              element={<WhyEngine />} />
            <Route path="decisions"        element={<DecisionLog />} />
            <Route path="onboarding-packs" element={<OnboardingPacks />} />
            <Route path="onboarding-packs/:id" element={<PackDetail />} />
            <Route path="search"           element={<GlobalSearch />} />

            {/* Settings */}
            <Route path="settings" element={<SettingsLayout />}>
              <Route index                element={<Navigate to="profile" replace />} />
              <Route path="profile"       element={<Profile />} />
              <Route path="workspace"     element={<Workspace />} />
              <Route path="sources"       element={<ConnectedSources />} />
              <Route path="members"       element={<TeamMembers />} />
              <Route path="billing"       element={<Billing />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="api-keys"      element={<ApiKeys />} />
              <Route path="audit-log"     element={<AuditLog />} />
              <Route path="security"      element={<Security />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="bottom-right" />
    </QueryClientProvider>
  )
}
