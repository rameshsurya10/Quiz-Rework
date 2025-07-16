import { createTheme } from '@mui/material/styles';

const teacherTheme = createTheme({
  palette: {
    primary: { main: '#090040' }, // Deep navy for accents only
    secondary: { main: '#471396' }, // Purple for text/buttons only
    background: {
      default: '#F5F5F5', // All backgrounds are #F5F5F5
      paper: '#F5F5F5',   // Card backgrounds are #F5F5F5
    },
    text: {
      primary: '#18181B', // Black for all text
      secondary: '#471396', // Purple for headings/buttons
    },
    success: { main: '#00C49A' },
    warning: { main: '#FFB703' },
    error: { main: '#EF233C' },
    info: { main: '#B13BFF' },
    accent: { main: '#B13BFF' },
    divider: '#471396',
  },
  shape: { borderRadius: 18 },
  typography: {
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    h6: { fontWeight: 700, color: '#471396' },
    h4: { fontWeight: 700, color: '#471396' },
    body2: { color: '#18181B' },
    allVariants: { color: '#18181B' },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 24px 0 rgba(71,19,150,0.10)',
          borderRadius: 18,
          border: '1px solid #471396',
          background: '#F5F5F5',
          color: '#18181B',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 700,
          textTransform: 'none',
          background: '#F5F5F5',
          color: '#471396',
          '&:hover': {
            background: '#B13BFF',
            color: '#fff',
          },
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          background: '#F5F5F5',
          color: '#471396',
          fontWeight: 700,
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#471396',
          background: '#F5F5F5',
          '&:hover': { color: '#B13BFF', background: '#F5F5F5' },
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          background: '#471396',
        }
      }
    },
    MuiBadge: {
      styleOverrides: {
        colorSecondary: {
          backgroundColor: '#B13BFF',
          color: '#fff',
        },
        colorInfo: {
          backgroundColor: '#471396',
          color: '#fff',
        },
        colorPrimary: {
          backgroundColor: '#1976d2', // Admin badge color applied to teacher
          color: '#fff',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: '#F5F5F5',
          color: '#471396',
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: '#F5F5F5',
          color: '#471396',
        }
      }
    },
  }
});

export default teacherTheme; 