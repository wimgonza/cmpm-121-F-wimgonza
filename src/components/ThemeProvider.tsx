import { useEffect } from 'react';
import type { ReactNode } from 'react'; // Type-only import
import { useTheme } from '../hooks/useTheme';

// ============================================================================
// THEME PROVIDER COMPONENT
// ============================================================================
interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { isDarkMode } = useTheme();

  // Apply theme class to body for global CSS control
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } else {
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    }
  }, [isDarkMode]);

  return <>{children}</>;
}