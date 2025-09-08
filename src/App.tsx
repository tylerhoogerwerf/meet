import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './lib/auth-context'
import HomePage from './pages/HomePage'
import RoomPage from './pages/RoomPage'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import CustomPage from './pages/CustomPage'

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/rooms/:roomName" element={<RoomPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/custom" element={<CustomPage />} />
        </Routes>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </AuthProvider>
  )
}

export default App
