import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App.tsx';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import './index.css';

// Lazy-loaded route components — code-split for smaller initial bundle
const LoginPage = lazy(() =>
  import('./components/auth/LoginPage').then(m => ({ default: m.LoginPage }))
);
const AuthCallbackPage = lazy(() =>
  import('./components/auth/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage }))
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={
            <div className="min-h-screen flex justify-center items-center bg-base-200">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          }>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <App />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
