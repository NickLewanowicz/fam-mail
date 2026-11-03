import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from './components/auth/AuthProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppLoader } from './components/layout/AppLoader'
import { AppLayout } from './components/layout/AppLayout'
import './index.css'
import { RouteTitle } from './components/layout/RouteTitle'



const LoginPage = lazy(() => import('./components/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const AuthCallbackPage = lazy(() => import('./components/auth/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CreatePage = lazy(() => import('./pages/CreatePage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<AppLoader />}>
            <Routes>
              <Route path="/login" element={<><RouteTitle title="Sign in" /><LoginPage /></>} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<><RouteTitle title="Dashboard" /><DashboardPage /></>} />
                <Route path="/create" element={<><RouteTitle title="New postcard" /><CreatePage /></>} />
                <Route path="/drafts/:id" element={<><RouteTitle title="Draft" /><CreatePage /></>} />
                <Route path="/history" element={<><RouteTitle title="History" /><HistoryPage /></>} />
                <Route path="*" element={<><RouteTitle title="Not found" /><NotFoundPage /></>} />
              </Route>
            </Routes>
          </Suspense>
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
    </MotionConfig>
  </React.StrictMode>,
)
