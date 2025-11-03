import { useEffect } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
        };
      };
    };
  }
}

export function useTelegram() {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, [tg]);

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    themeParams: tg?.themeParams,
  };
}

export function useTelegramTheme() {
  const { themeParams } = useTelegram();

  useEffect(() => {
    if (themeParams) {
      const root = document.documentElement;

      // Determine if dark theme based on background color brightness
      if (themeParams.bg_color) {
        root.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);

        // Check if background is dark
        const isDark = isColorDark(themeParams.bg_color);
        if (isDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }

      if (themeParams.text_color) {
        root.style.setProperty('--tg-theme-text-color', themeParams.text_color);
      }
      if (themeParams.hint_color) {
        root.style.setProperty('--tg-theme-hint-color', themeParams.hint_color);
      }
      if (themeParams.button_color) {
        root.style.setProperty('--tg-theme-button-color', themeParams.button_color);
      }
      if (themeParams.button_text_color) {
        root.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color);
      }
    }
  }, [themeParams]);
}

// Helper function to determine if a color is dark
function isColorDark(color: string): boolean {
  // Remove # if present
  const hex = color.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return true if dark (luminance < 0.5)
  return luminance < 0.5;
}
