import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from './components/auth/AuthProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppLoader } from './components/layout/AppLoader'
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
              <Route path="/" element={<ProtectedRoute><><RouteTitle title="Dashboard" /><DashboardPage /></></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><><RouteTitle title="New postcard" /><CreatePage /></></ProtectedRoute>} />
              <Route path="/drafts/:id" element={<ProtectedRoute><><RouteTitle title="Draft" /><CreatePage /></></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><><RouteTitle title="History" /><HistoryPage /></></ProtectedRoute>} />
              <Route path="*" element={<ProtectedRoute><><RouteTitle title="Not found" /><NotFoundPage /></></ProtectedRoute>} />
            </Routes>
          </Suspense>
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
    </MotionConfig>
  </React.StrictMode>,
)
