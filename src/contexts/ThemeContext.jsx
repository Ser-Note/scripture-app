// src/contexts/ThemeContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('scriptureAppTheme')
    return saved || 'default'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('scriptureAppTheme', theme)
  }, [theme])

  const setThemeByName = (name) => setTheme(name)

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme: setThemeByName,
      isDark: theme === 'dark',
      isChristmas: theme === 'christmas',
      isThanksgiving: theme === 'thanksgiving',
      isEaster: theme === 'easter',
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
