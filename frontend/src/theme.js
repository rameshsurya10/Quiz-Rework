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

// Warm and pleasant color palette for teacher interface
const warmPalette = {
  primary: {
    main: '#e17055',
    light: '#f39c7c',
    dark: '#d1602f',
    contrastText: '#ffffff',
    50: '#fdf6f4',
    100: '#fbe8e2',
    200: '#f7d1c6',
    300: '#f0b09e',
    400: '#e68369',
    500: '#e17055',
    600: '#d1602f',
    700: '#b54d27',
    800: '#964425',
    900: '#7d3e26',
  },
  secondary: {
    main: '#74b9ff',
    light: '#a8d0ff',
    dark: '#4f8dd6',
    contrastText: '#ffffff',
  },
  success: {
    main: '#55a3ff',
    light: '#81c7ff',
    dark: '#2e7fd6',
  },
  warning: {
    main: '#fdcb6e',
    light: '#fed896',
    dark: '#f1b95a',
  },
  error: {
    main: '#fd7f7f',
    light: '#ff9999',
    dark: '#e55656',
  },
  info: {
    main: '#74b9ff',
    light: '#a8d0ff',
    dark: '#4f8dd6',
  },
  background: {
    default: '#fef8f6',
    paper: '#ffffff',
  },
  text: {
    primary: '#2d3436',
    secondary: '#636e72',
  },
};

// Create a warm theme function
const createWarmTheme = () => {
  return createTheme({
    breakpoints,
    palette: {
      mode: 'light',
      ...warmPalette,
    },
    typography: {
      fontFamily: '"Inter", "Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '-0.01em',
        color: warmPalette.primary.main,
      },
      h2: {
        fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
        color: warmPalette.primary.main,
      },
      h3: {
        fontSize: 'clamp(1.25rem, 3vw, 1.875rem)',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.005em',
        color: warmPalette.primary.main,
      },
      h4: {
        fontSize: 'clamp(1.125rem, 2.5vw, 1.5rem)',
        fontWeight: 600,
        lineHeight: 1.4,
        color: warmPalette.primary.main,
      },
      h5: {
        fontSize: 'clamp(1rem, 2vw, 1.25rem)',
        fontWeight: 600,
        lineHeight: 1.4,
        color: warmPalette.primary.main,
      },
      h6: {
        fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)',
        fontWeight: 600,
        lineHeight: 1.4,
        color: warmPalette.primary.main,
      },
      subtitle1: {
        fontSize: 'clamp(0.8rem, 1.25vw, 1rem)',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      subtitle2: {
        fontSize: 'clamp(0.75rem, 1.125vw, 0.875rem)',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: 'clamp(0.8rem, 1.25vw, 0.875rem)',
        lineHeight: 1.6,
        fontWeight: 400,
      },
      body2: {
        fontSize: 'clamp(0.75rem, 1.125vw, 0.8rem)',
        lineHeight: 1.6,
        fontWeight: 400,
      },
      button: {
        fontSize: 'clamp(0.75rem, 1.125vw, 0.8rem)',
        fontWeight: 600,
        textTransform: 'none',
        letterSpacing: '0.02em',
      },
      caption: {
        fontSize: 'clamp(0.65rem, 0.9vw, 0.7rem)',
        lineHeight: 1.4,
        fontWeight: 400,
      },
      overline: {
        fontSize: 'clamp(0.6rem, 0.8vw, 0.65rem)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      },
    },
    shape: {
      borderRadius: 12,
    },
    spacing: 6,
    shadows: [
      'none',
      '0px 1px 3px rgba(225, 112, 85, 0.12), 0px 1px 2px rgba(225, 112, 85, 0.06)',
      '0px 2px 4px rgba(225, 112, 85, 0.12), 0px 2px 3px rgba(225, 112, 85, 0.08)',
      '0px 3px 6px rgba(225, 112, 85, 0.15), 0px 2px 4px rgba(225, 112, 85, 0.08)',
      '0px 4px 8px rgba(225, 112, 85, 0.15), 0px 2px 4px rgba(225, 112, 85, 0.10)',
      '0px 6px 12px rgba(225, 112, 85, 0.18), 0px 4px 8px rgba(225, 112, 85, 0.12)',
      '0px 8px 16px rgba(225, 112, 85, 0.20), 0px 4px 8px rgba(225, 112, 85, 0.15)',
      '0px 12px 24px rgba(225, 112, 85, 0.22), 0px 6px 12px rgba(225, 112, 85, 0.18)',
      '0px 16px 32px rgba(225, 112, 85, 0.24), 0px 8px 16px rgba(225, 112, 85, 0.20)',
      '0px 20px 40px rgba(225, 112, 85, 0.26), 0px 10px 20px rgba(225, 112, 85, 0.22)',
      '0px 24px 48px rgba(225, 112, 85, 0.28), 0px 12px 24px rgba(225, 112, 85, 0.24)',
      '0px 32px 64px rgba(225, 112, 85, 0.30), 0px 16px 32px rgba(225, 112, 85, 0.26)',
      '0px 40px 80px rgba(225, 112, 85, 0.32), 0px 20px 40px rgba(225, 112, 85, 0.28)',
      '0px 48px 96px rgba(225, 112, 85, 0.34), 0px 24px 48px rgba(225, 112, 85, 0.30)',
      '0px 56px 112px rgba(225, 112, 85, 0.36), 0px 28px 56px rgba(225, 112, 85, 0.32)',
      '0px 64px 128px rgba(225, 112, 85, 0.38), 0px 32px 64px rgba(225, 112, 85, 0.34)',
      '0px 72px 144px rgba(225, 112, 85, 0.40), 0px 36px 72px rgba(225, 112, 85, 0.36)',
      '0px 80px 160px rgba(225, 112, 85, 0.42), 0px 40px 80px rgba(225, 112, 85, 0.38)',
      '0px 88px 176px rgba(225, 112, 85, 0.44), 0px 44px 88px rgba(225, 112, 85, 0.40)',
      '0px 96px 192px rgba(225, 112, 85, 0.46), 0px 48px 96px rgba(225, 112, 85, 0.42)',
      '0px 104px 208px rgba(225, 112, 85, 0.48), 0px 52px 104px rgba(225, 112, 85, 0.44)',
      '0px 112px 224px rgba(225, 112, 85, 0.50), 0px 56px 112px rgba(225, 112, 85, 0.46)',
      '0px 120px 240px rgba(225, 112, 85, 0.52), 0px 60px 120px rgba(225, 112, 85, 0.48)',
      '0px 128px 256px rgba(225, 112, 85, 0.54), 0px 64px 128px rgba(225, 112, 85, 0.50)',
      '0px 136px 272px rgba(225, 112, 85, 0.56), 0px 68px 136px rgba(225, 112, 85, 0.52)',
    ],
    components: {
      // Global component overrides for compact, responsive design
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontSize: '14px',
            lineHeight: 1.5,
            scrollbarWidth: 'thin',
            scrollbarColor: `${warmPalette.primary.light} ${warmPalette.background.default}`,
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: warmPalette.background.default,
            },
            '&::-webkit-scrollbar-thumb': {
              background: warmPalette.primary.light,
              borderRadius: '3px',
              '&:hover': {
                background: warmPalette.primary.main,
              },
            },
          },
        },
      },
      MuiContainer: {
        styleOverrides: {
          root: {
            paddingLeft: 16,
            paddingRight: 16,
            '@media (max-width: 768px)': {
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
            minHeight: 36,
            borderRadius: 8,
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '0.8rem',
            padding: '8px 16px',
            letterSpacing: '0.02em',
            '@media (max-width: 600px)': {
              minHeight: 40,
              fontSize: '0.85rem',
            },
          },
          contained: {
            boxShadow: `0 2px 8px ${warmPalette.primary.main}40`,
            '&:hover': {
              boxShadow: `0 4px 16px ${warmPalette.primary.main}60`,
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
          outlined: {
            borderWidth: '1.5px',
            '&:hover': {
              borderWidth: '1.5px',
              backgroundColor: `${warmPalette.primary.main}08`,
            },
          },
          text: {
            '&:hover': {
              backgroundColor: `${warmPalette.primary.main}08`,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${warmPalette.primary.main}15`,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease-in-out',
            '@media (max-width: 768px)': {
              borderRadius: 10,
              margin: '6px 0',
            },
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: `0 8px 24px ${warmPalette.primary.main}25`,
              borderColor: `${warmPalette.primary.main}25`,
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: '16px',
            '@media (max-width: 768px)': {
              padding: '12px',
            },
            '@media (max-width: 600px)': {
              padding: '10px',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            '@media (max-width: 600px)': {
              borderRadius: 8,
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiInputBase-root': {
              borderRadius: 8,
              fontSize: '0.85rem',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              '@media (max-width: 600px)': {
                fontSize: '16px',
              },
            },
            '& .MuiInputBase-input': {
              padding: '10px 12px',
              '@media (max-width: 600px)': {
                padding: '12px 14px',
              },
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: `${warmPalette.primary.main}30`,
                borderWidth: '1.5px',
              },
              '&:hover fieldset': {
                borderColor: `${warmPalette.primary.main}50`,
              },
              '&.Mui-focused fieldset': {
                borderColor: warmPalette.primary.main,
              },
            },
            '& .MuiInputLabel-root': {
              fontSize: '0.85rem',
              '&.Mui-focused': {
                color: warmPalette.primary.main,
              },
            },
          },
        },
      },
      MuiFormControl: {
        styleOverrides: {
          root: {
            marginBottom: '12px',
            '& .MuiInputLabel-root': {
              fontSize: '0.85rem',
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontSize: '0.85rem',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: `${warmPalette.primary.main}30`,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: `${warmPalette.primary.main}50`,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: warmPalette.primary.main,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 500,
            height: 'auto',
            padding: '4px 2px',
            backgroundColor: `${warmPalette.primary.main}15`,
            color: warmPalette.primary.dark,
            '@media (max-width: 600px)': {
              fontSize: '0.7rem',
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            '@media (max-width: 600px)': {
              margin: 12,
              width: 'calc(100% - 24px)',
              maxWidth: 'none',
              borderRadius: 10,
            },
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: '16px',
            '@media (max-width: 600px)': {
              padding: '12px',
            },
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '12px 16px',
            gap: '8px',
            '@media (max-width: 600px)': {
              padding: '10px 12px',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: 8,
            transition: 'all 0.15s ease',
            '&:hover': {
              backgroundColor: `${warmPalette.primary.main}10`,
              transform: 'scale(1.05)',
            },
            '@media (max-width: 600px)': {
              padding: 10,
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 40,
            '& .MuiTabs-indicator': {
              height: 2,
              borderRadius: '2px 2px 0 0',
              backgroundColor: warmPalette.primary.main,
            },
            '@media (max-width: 600px)': {
              minHeight: 44,
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 40,
            fontSize: '0.8rem',
            textTransform: 'none',
            fontWeight: 600,
            color: warmPalette.text.secondary,
            '&.Mui-selected': {
              color: warmPalette.primary.main,
            },
            '@media (max-width: 600px)': {
              minHeight: 44,
              minWidth: 0,
              padding: '10px 12px',
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            backgroundColor: `${warmPalette.primary.main}15`,
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              backgroundColor: warmPalette.primary.main,
            },
          },
        },
      },
      MuiSnackbar: {
        styleOverrides: {
          root: {
            '& .MuiSnackbarContent-root': {
              borderRadius: 8,
              backgroundColor: 'rgba(45, 52, 54, 0.95)',
              color: '#ffffff',
              backdropFilter: 'blur(10px)',
              fontSize: '0.85rem',
            },
          },
        },
      },
    },
  });
};

// Create the default warm theme
const theme = createWarmTheme();

// Export the theme
export default theme;
export { createWarmTheme };