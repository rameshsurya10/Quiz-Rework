import React, { useMemo } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// This is a simplified theme provider that ALWAYS returns a pleasant, modern light theme.
export const TeacherThemeProvider = ({ children }) => {
  const theme = useMemo(() => {
    const appearance = 'modern';

    const currentAppearance = {
      primary: '#4ecdc4',
      secondary: '#7877c6',
      accent: '#ff6b6b',
      background: {
        default: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        paper: 'rgba(255, 255, 255, 0.8)',
      }
    };

    return createTheme({
      palette: {
        mode: 'light',
        primary: {
          main: currentAppearance.primary,
          contrastText: '#000000',
        },
        secondary: {
          main: currentAppearance.secondary,
          contrastText: '#000000',
        },
        accent: {
          main: currentAppearance.accent,
        },
        background: {
          default: '#f5f7fa',
          paper: '#ffffff',
        },
        text: {
          primary: 'rgba(0, 0, 0, 0.87)',
          secondary: 'rgba(0, 0, 0, 0.6)',
        },
        divider: 'rgba(0, 0, 0, 0.12)',
      },
      shape: {
        borderRadius: 16,
      },
      typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
          fontWeight: 600,
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          lineHeight: 1.2,
        },
        h2: {
          fontWeight: 600,
          fontSize: 'clamp(1.5rem, 3.5vw, 2.125rem)',
          lineHeight: 1.3,
        },
        h3: {
          fontWeight: 500,
          fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
          lineHeight: 1.3,
        },
        h4: {
          fontWeight: 500,
          fontSize: 'clamp(1.125rem, 2.5vw, 1.5rem)',
          lineHeight: 1.4,
        },
        h5: {
          fontWeight: 500,
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          lineHeight: 1.4,
        },
        h6: {
          fontWeight: 500,
          fontSize: 'clamp(0.875rem, 1.8vw, 1.125rem)',
          lineHeight: 1.5,
        },
        body1: {
          fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
          lineHeight: 1.5,
        },
        body2: {
          fontSize: 'clamp(0.75rem, 1.3vw, 0.875rem)',
          lineHeight: 1.5,
        },
        subtitle1: {
          fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
          lineHeight: 1.5,
          fontWeight: 500,
        },
        subtitle2: {
          fontSize: 'clamp(0.75rem, 1.3vw, 0.875rem)',
          lineHeight: 1.5,
          fontWeight: 500,
        },
        caption: {
          fontSize: 'clamp(0.625rem, 1.1vw, 0.75rem)',
          lineHeight: 1.4,
        },
        button: {
          fontSize: 'clamp(0.75rem, 1.3vw, 0.875rem)',
          fontWeight: 600,
          textTransform: 'none',
        },
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              textTransform: 'none',
              fontWeight: 600,
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 20,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: 16,
            },
          },
        },
      },
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}; 