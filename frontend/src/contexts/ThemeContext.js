import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const CustomThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('themeMode') || 'dark';
  });
  
  const [appearance, setAppearance] = useState(() => {
    return localStorage.getItem('themeAppearance') || 'modern';
  });

  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('highContrast') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
    if (mode === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('themeAppearance', appearance);
  }, [appearance]);

  useEffect(() => {
    localStorage.setItem('highContrast', highContrast.toString());
  }, [highContrast]);

  const getThemeConfig = () => {
    const isDark = mode === 'dark';
    
    // Base colors for different appearances
    const appearances = {
      modern: {
        primary: highContrast ? '#00ffff' : '#4ecdc4',
        secondary: highContrast ? '#ff00ff' : '#7877c6',
        accent: highContrast ? '#ffff00' : '#ff6b6b',
        background: {
          default: isDark 
            ? (highContrast ? '#000000' : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)')
            : (highContrast ? '#ffffff' : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'),
          paper: isDark 
            ? (highContrast ? '#111111' : 'rgba(255, 255, 255, 0.05)')
            : (highContrast ? '#f5f5f5' : 'rgba(255, 255, 255, 0.8)'),
        }
      },
      classic: {
        primary: highContrast ? '#0066cc' : '#1976d2',
        secondary: highContrast ? '#cc6600' : '#dc004e',
        accent: highContrast ? '#009900' : '#388e3c',
        background: {
          default: isDark 
            ? (highContrast ? '#000000' : 'linear-gradient(135deg, #263238 0%, #37474f 100%)')
            : (highContrast ? '#ffffff' : 'linear-gradient(135deg, #fafafa 0%, #e0e0e0 100%)'),
          paper: isDark 
            ? (highContrast ? '#1a1a1a' : 'rgba(255, 255, 255, 0.08)')
            : (highContrast ? '#f0f0f0' : 'rgba(255, 255, 255, 0.9)'),
        }
      },
      royal: {
        primary: highContrast ? '#6600cc' : '#673ab7',
        secondary: highContrast ? '#cc9900' : '#ff9800',
        accent: highContrast ? '#cc0066' : '#e91e63',
    background: {
          default: isDark 
            ? (highContrast ? '#000000' : 'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)')
            : (highContrast ? '#ffffff' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'),
          paper: isDark 
            ? (highContrast ? '#1a0d3a' : 'rgba(255, 255, 255, 0.06)')
            : (highContrast ? '#f3f0ff' : 'rgba(255, 255, 255, 0.85)'),
        }
      }
    };

    const currentAppearance = appearances[appearance] || appearances.modern;

    return createTheme({
  palette: {
        mode: mode,
    primary: {
          main: currentAppearance.primary,
          contrastText: isDark ? '#ffffff' : '#000000',
    },
    secondary: {
          main: currentAppearance.secondary,
          contrastText: isDark ? '#ffffff' : '#000000',
        },
        accent: {
          main: currentAppearance.accent,
    },
    background: {
          default: isDark 
            ? (highContrast ? '#000000' : '#1a1a2e')
            : (highContrast ? '#ffffff' : '#f5f7fa'),
          paper: isDark 
            ? (highContrast ? '#111111' : '#16213e')
            : (highContrast ? '#f5f5f5' : '#ffffff'),
    },
    text: {
          primary: isDark 
            ? (highContrast ? '#ffffff' : 'rgba(255, 255, 255, 0.95)')
            : (highContrast ? '#000000' : 'rgba(0, 0, 0, 0.87)'),
          secondary: isDark 
            ? (highContrast ? '#cccccc' : 'rgba(255, 255, 255, 0.7)')
            : (highContrast ? '#333333' : 'rgba(0, 0, 0, 0.6)'),
    },
        divider: isDark 
          ? (highContrast ? '#ffffff' : 'rgba(255, 255, 255, 0.12)')
          : (highContrast ? '#000000' : 'rgba(0, 0, 0, 0.12)'),
      },
      shape: {
        borderRadius: highContrast ? 4 : (appearance === 'classic' ? 8 : 16),
      },
      typography: {
        fontFamily: appearance === 'royal' 
          ? '"Playfair Display", "Times New Roman", serif'
          : appearance === 'classic'
          ? '"Roboto", "Helvetica", "Arial", sans-serif'
          : '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
          fontWeight: appearance === 'royal' ? 700 : 600,
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          lineHeight: 1.2,
        },
        h2: {
          fontWeight: appearance === 'royal' ? 700 : 600,
          fontSize: 'clamp(1.5rem, 3.5vw, 2.125rem)',
          lineHeight: 1.3,
        },
        h3: {
          fontWeight: appearance === 'royal' ? 600 : 500,
          fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
          lineHeight: 1.3,
        },
        h4: {
          fontWeight: appearance === 'royal' ? 600 : 500,
          fontSize: 'clamp(1.125rem, 2.5vw, 1.5rem)',
          lineHeight: 1.4,
        },
        h5: {
          fontWeight: appearance === 'royal' ? 600 : 500,
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          lineHeight: 1.4,
        },
        h6: {
          fontWeight: appearance === 'royal' ? 600 : 500,
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
              borderRadius: highContrast ? 4 : (appearance === 'classic' ? 8 : 12),
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: highContrast ? 'none' : undefined,
              '&:hover': {
                boxShadow: highContrast ? 'none' : undefined,
              }
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: highContrast ? 4 : (appearance === 'classic' ? 8 : 20),
              boxShadow: highContrast 
                ? `2px 2px 0px ${isDark ? '#ffffff' : '#000000'}`
                : undefined,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: highContrast ? 4 : (appearance === 'classic' ? 8 : 16),
              boxShadow: highContrast 
                ? `1px 1px 0px ${isDark ? '#ffffff' : '#000000'}`
                : undefined,
            },
          },
        },
      },
      custom: {
        appearance,
        highContrast,
        glassmorphism: !highContrast && appearance === 'modern',
        colors: currentAppearance,
      }
    });
  };

  const theme = getThemeConfig();

  const toggleMode = () => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  };

  const changeAppearance = (newAppearance) => {
    setAppearance(newAppearance);
  };

  const toggleHighContrast = () => {
    setHighContrast(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{
      mode,
      appearance,
      highContrast,
      toggleMode,
      changeAppearance,
      toggleHighContrast,
      theme,
    }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
