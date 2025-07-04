import { createTheme } from '@mui/material/styles';

// Enhanced breakpoints for better responsive design
const breakpoints = {
  values: {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  },
};

// Create a theme instance with enhanced glassy effects
const theme = createTheme({
  breakpoints,
  palette: {
    primary: {
      main: '#6c63ff',
      light: '#9c88ff',
      dark: '#3f35cc',
      contrastText: '#ffffff',
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
    },
    secondary: {
      main: '#4ecdc4',
      light: '#7efff7',
      dark: '#1b9b93',
      contrastText: '#000000',
    },
    success: {
      main: '#27ae60',
      light: '#34d399',
      dark: '#059669',
    },
    warning: {
      main: '#f39c12',
      light: '#fbbf24',
      dark: '#d97706',
    },
    error: {
      main: '#e74c3c',
      light: '#f87171',
      dark: '#dc2626',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#2c3e50',
      secondary: '#7f8c8d',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: 'clamp(1.8rem, 4vw, 3rem)',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: 'clamp(1.4rem, 3vw, 2rem)',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: 'clamp(1.2rem, 2.5vw, 1.75rem)',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: 'clamp(1rem, 1.5vw, 1.25rem)',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: 'clamp(0.8rem, 1.25vw, 0.875rem)',
      lineHeight: 1.6,
    },
    button: {
      fontSize: 'clamp(0.8rem, 1.25vw, 0.875rem)',
      fontWeight: 600,
      textTransform: 'none',
    },
    caption: {
      fontSize: 'clamp(0.7rem, 1vw, 0.75rem)',
      lineHeight: 1.4,
    },
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  components: {
    // Global component overrides for responsive design
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontSize: '16px', // Prevents zoom on iOS
          lineHeight: 1.6,
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: 16,
          paddingRight: 16,
          '@media (max-width: 600px)': {
            paddingLeft: 12,
            paddingRight: 12,
          },
          '@media (max-width: 480px)': {
            paddingLeft: 8,
            paddingRight: 8,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44, // Touch-friendly
          borderRadius: 8,
          fontWeight: 600,
          textTransform: 'none',
          '@media (max-width: 600px)': {
            minHeight: 48, // Even more touch-friendly on mobile
            fontSize: '0.9rem',
          },
        },
        contained: {
          boxShadow: '0 4px 12px rgba(108, 99, 255, 0.25)',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(108, 99, 255, 0.35)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            borderRadius: 8,
            fontSize: '1rem',
            '@media (max-width: 600px)': {
              fontSize: '16px', // Prevents zoom on iOS
            },
          },
          '& .MuiInputBase-input': {
            padding: '12px 14px',
            '@media (max-width: 600px)': {
              padding: '14px 16px', // More touch-friendly
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          '@media (max-width: 600px)': {
            borderRadius: 12,
            margin: '8px 0',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 24,
          '@media (max-width: 768px)': {
            padding: 20,
          },
          '@media (max-width: 600px)': {
            padding: 16,
          },
          '@media (max-width: 480px)': {
            padding: 12,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '@media (max-width: 600px)': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          '@media (max-width: 600px)': {
            margin: 16,
            width: 'calc(100% - 32px)',
            maxWidth: 'none',
            borderRadius: 12,
          },
        },
        paperScrollPaper: {
          '@media (max-width: 600px)': {
            maxHeight: 'calc(100% - 32px)',
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '24px 24px 16px',
          fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
          '@media (max-width: 600px)': {
            padding: '20px 20px 12px',
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '0 24px',
          '@media (max-width: 600px)': {
            padding: '0 20px',
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px 24px',
          gap: 12,
          '@media (max-width: 600px)': {
            padding: '12px 20px 20px',
            flexDirection: 'column-reverse',
            '& > :not(:first-of-type)': {
              marginLeft: 0,
              marginBottom: 8,
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          minHeight: 44,
          '@media (max-width: 600px)': {
            minHeight: 48,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: 'clamp(0.7rem, 1vw, 0.8rem)',
          height: 'auto',
          padding: '4px 0',
          '@media (max-width: 600px)': {
            fontSize: '0.75rem',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
          '@media (max-width: 600px)': {
            minHeight: 48,
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          fontSize: 'clamp(0.8rem, 1.25vw, 0.875rem)',
          textTransform: 'none',
          fontWeight: 600,
          '@media (max-width: 600px)': {
            minHeight: 48,
            minWidth: 0,
            padding: '12px 8px',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: 'clamp(0.8rem, 1.25vw, 0.875rem)',
          padding: '12px 16px',
          '@media (max-width: 768px)': {
            padding: '8px 12px',
            fontSize: '0.8rem',
          },
          '@media (max-width: 600px)': {
            padding: '6px 8px',
            fontSize: '0.75rem',
          },
        },
        head: {
          fontWeight: 600,
          backgroundColor: 'rgba(108, 99, 255, 0.05)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: 8,
          '@media (max-width: 600px)': {
            padding: 12, // More touch-friendly
          },
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          marginBottom: 16,
          '@media (max-width: 600px)': {
            marginBottom: 12,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          '@media (max-width: 600px)': {
            fontSize: '0.9rem',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          fontSize: '1rem',
          '@media (max-width: 600px)': {
            fontSize: '16px', // Prevents zoom on iOS
          },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        popper: {
          '@media (max-width: 600px)': {
            width: 'calc(100vw - 32px) !important',
            left: '16px !important',
            right: '16px !important',
          },
        },
        paper: {
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        },
        option: {
          fontSize: 'clamp(0.8rem, 1.25vw, 0.875rem)',
          minHeight: 44,
          '@media (max-width: 600px)': {
            minHeight: 48,
            padding: '12px 16px',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 8,
          '@media (max-width: 600px)': {
            height: 6,
          },
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            width: '40px !important',
            height: '40px !important',
          },
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            left: 16,
            right: 16,
            bottom: 16,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: 'clamp(0.8rem, 1.25vw, 0.875rem)',
          '@media (max-width: 600px)': {
            fontSize: '0.8rem',
          },
        },
      },
    },
    // Custom glass effect for modern appearance
    MuiBox: {
      styleOverrides: {
        root: {
          '&.glass-effect': {
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            '@media (max-width: 600px)': {
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            },
          },
        },
      },
    },
  },
});

export default theme;