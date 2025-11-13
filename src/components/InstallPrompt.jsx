import { useState, useEffect } from 'react'
import { 
  isPWA, 
  isMobileDevice, 
  getInstallInstructions,
  requestNotificationPermission 
} from '../utils/pwa'

function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    // Don't show if already installed
    if (isPWA()) {
      return
    }

    // Listen for the install prompt event
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // For iOS/Safari, show manual instructions after a delay
    if (isMobileDevice() && !deferredPrompt) {
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show native install prompt (Android/Chrome)
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
        // Request notification permission after install
        await requestNotificationPermission()
      }
      
      setDeferredPrompt(null)
      setShowPrompt(false)
    } else {
      // Show manual instructions (iOS/Safari)
      setShowInstructions(true)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Remember dismissal for 7 days
    localStorage.setItem('installPromptDismissed', Date.now() + 7 * 24 * 60 * 60 * 1000)
  }

  if (!showPrompt || isPWA()) {
    return null
  }

  const instructions = getInstallInstructions()

  return (
    <>
      {/* Install Banner */}
      <div className="install-prompt-banner">
        <div className="install-prompt-content">
          <span className="install-icon">📱</span>
          <div className="install-text">
            <strong>Install Scripture App</strong>
            <p>Get quick access and notifications</p>
          </div>
        </div>
        <div className="install-actions">
          <button onClick={handleInstallClick} className="install-btn">
            Install
          </button>
          <button onClick={handleDismiss} className="dismiss-btn">
            ✕
          </button>
        </div>
      </div>

      {/* Manual Instructions Modal */}
      {showInstructions && (
        <div className="modal-overlay" onClick={() => setShowInstructions(false)}>
          <div className="modal-content install-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowInstructions(false)}>
              ✕
            </button>
            
            <h2>📱 Install App</h2>
            <p className="install-modal-subtitle">
              Install on your {instructions.device} device:
            </p>
            
            <ol className="install-steps">
              {instructions.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
            
            <button 
              onClick={() => setShowInstructions(false)} 
              className="got-it-btn"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default InstallPrompt
