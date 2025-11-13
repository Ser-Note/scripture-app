// PWA Installation and Notification Utilities

/**
 * Check if app is installed as PWA
 */
export const isPWA = () => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

/**
 * Check if device supports PWA installation
 */
export const canInstallPWA = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

/**
 * Request notification permission
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

/**
 * Show a local notification (for testing)
 */
export const showNotification = (title, options = {}) => {
  if (Notification.permission === 'granted') {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options: {
          body: options.body || '',
          icon: options.icon || '/icon-192.png',
          badge: options.badge || '/icon-192.png',
          vibrate: options.vibrate || [200, 100, 200],
          tag: options.tag || 'scripture-notification',
          requireInteraction: options.requireInteraction || false,
          ...options
        }
      })
    } else {
      // Fallback to direct notification
      new Notification(title, {
        body: options.body || '',
        icon: options.icon || '/icon-192.png',
        ...options
      })
    }
  }
}

/**
 * Get installation prompt handler
 * Usage: 
 * const { showInstallPrompt, installPromptEvent } = useInstallPrompt()
 */
export const useInstallPrompt = () => {
  let deferredPrompt = null

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault()
    // Stash the event so it can be triggered later
    deferredPrompt = e
    console.log('PWA install prompt available')
  })

  const showInstallPrompt = async () => {
    if (!deferredPrompt) {
      console.log('No install prompt available')
      return false
    }

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to install prompt: ${outcome}`)

    // Clear the deferred prompt
    deferredPrompt = null

    return outcome === 'accepted'
  }

  return {
    showInstallPrompt,
    hasInstallPrompt: () => deferredPrompt !== null
  }
}

/**
 * Check if user is on mobile device
 */
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Get PWA install instructions based on device
 */
export const getInstallInstructions = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)

  if (isIOS) {
    return {
      device: 'iOS',
      steps: [
        '1. Tap the Share button (square with arrow)',
        '2. Scroll down and tap "Add to Home Screen"',
        '3. Tap "Add" in the top right corner'
      ]
    }
  }

  if (isAndroid) {
    return {
      device: 'Android',
      steps: [
        '1. Tap the menu button (three dots)',
        '2. Tap "Add to Home screen" or "Install app"',
        '3. Tap "Add" or "Install"'
      ]
    }
  }

  return {
    device: 'Desktop',
    steps: [
      '1. Click the install icon in the address bar',
      '2. Click "Install" in the popup'
    ]
  }
}
