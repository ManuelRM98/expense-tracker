import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import LoginPage  from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import AuthSplash from './components/AuthSplash.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* AuthSplash prevents the login-page flash while the session is loading */}
        <AuthSplash>
          <Routes>
            {/* Public routes — rendered outside the app shell */}
            <Route path="/login"  element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            {/* All other routes go through the authenticated App shell */}
            <Route path="/*" element={<App />} />
          </Routes>
        </AuthSplash>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
