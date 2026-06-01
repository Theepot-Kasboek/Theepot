'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const opgeslagen = localStorage.getItem('theme') as Theme | null
    const voorkeur = opgeslagen ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setTheme(voorkeur)
    document.documentElement.setAttribute('data-theme', voorkeur)
  }, [])

  function toggleTheme() {
    const nieuw: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(nieuw)
    localStorage.setItem('theme', nieuw)
    document.documentElement.setAttribute('data-theme', nieuw)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
