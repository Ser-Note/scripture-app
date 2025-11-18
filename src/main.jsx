import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'
import { AuthProvider } from './contexts/AuthContext'
import { BookmarksProvider } from './contexts/BookmarksContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { LikesProvider } from './contexts/LikesContext'
import { AnnouncementsProvider } from './contexts/AnnouncementsContext'

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope)
        
        // Check for updates every hour
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error)
      })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BookmarksProvider>
          <LikesProvider>
            <AnnouncementsProvider>
              <App />
            </AnnouncementsProvider>
          </LikesProvider>
        </BookmarksProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
