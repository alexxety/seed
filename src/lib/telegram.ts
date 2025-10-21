import { useEffect } from 'react'

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        close: () => void
        themeParams: {
          bg_color?: string
          text_color?: string
          hint_color?: string
          button_color?: string
          button_text_color?: string
        }
        initDataUnsafe?: {
          user?: {
            id: number
            first_name?: string
            last_name?: string
            username?: string
          }
        }
      }
    }
  }
}

export function useTelegram() {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined

  useEffect(() => {
    if (tg) {
      tg.ready()
      tg.expand()
    }
  }, [tg])

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    themeParams: tg?.themeParams,
  }
}

export function useTelegramTheme() {
  const { themeParams } = useTelegram()

  useEffect(() => {
    if (themeParams) {
      const root = document.documentElement
      if (themeParams.bg_color) {
        root.style.setProperty('--tg-theme-bg-color', themeParams.bg_color)
      }
      if (themeParams.text_color) {
        root.style.setProperty('--tg-theme-text-color', themeParams.text_color)
      }
      if (themeParams.hint_color) {
        root.style.setProperty('--tg-theme-hint-color', themeParams.hint_color)
      }
      if (themeParams.button_color) {
        root.style.setProperty('--tg-theme-button-color', themeParams.button_color)
      }
      if (themeParams.button_text_color) {
        root.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color)
      }
    }
  }, [themeParams])
}
