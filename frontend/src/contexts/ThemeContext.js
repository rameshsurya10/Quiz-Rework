import React, { createContext, useState, useMemo, useEffect } from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider, responsiveFontSizes } from '@mui/material/styles';

export const ThemeContext = createContext({
  mode: 'light',
  toggleTheme: () => {},
  highContrastMode: false,
  toggleHighContrast: () => {},
  fontSize: 'medium',
  changeFontSize: () => {},
});

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

const highContrastTheme = createTheme({
  palette: {
    mode: 'dark', // Based on dark mode for accessibility
    primary: {
      main: '#FFFFFF',
    },
    secondary: {
      main: '#FFFF00',
    },
    background: {
      default: '#000000',
      paper: '#000000',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#CCCCCC',
    },
  },
});

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('light');
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [fontSize, setFontSize] = useState('medium');

  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode) {
      setMode(savedMode);
    }
    const savedHighContrast = localStorage.getItem('highContrastMode');
    if (savedHighContrast) {
      setHighContrastMode(JSON.parse(savedHighContrast));
    }
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
      setFontSize(savedFontSize);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  const toggleHighContrast = () => {
    const newHighContrast = !highContrastMode;
    setHighContrastMode(newHighContrast);
    localStorage.setItem('highContrastMode', JSON.stringify(newHighContrast));
  };

  const changeFontSize = (event) => {
    const newSize = event.target.value;
    setFontSize(newSize);
    localStorage.setItem('fontSize', newSize);
  };

  const theme = useMemo(() => {
    const baseTheme = highContrastMode ? highContrastTheme : (mode === 'light' ? lightTheme : darkTheme);

    // Define font size adjustments for each level
    const fontAdjustments = {
      small: -2,
      medium: 0,
      large: 2,
    };
    const adjustment = fontAdjustments[fontSize] || 0;

    // Helper to create a responsive font size object
    const createTypographyVariant = (baseSize) => ({
      fontSize: `${baseSize + adjustment}px`,
    });

    let configuredTheme = createTheme({
      ...baseTheme,
      typography: {
        ...baseTheme.typography,
        h1: createTypographyVariant(32),
        h2: createTypographyVariant(28),
        h3: createTypographyVariant(24),
        h4: createTypographyVariant(20),
        h5: createTypographyVariant(18),
        h6: createTypographyVariant(16),
        subtitle1: createTypographyVariant(16),
        subtitle2: createTypographyVariant(14),
        body1: createTypographyVariant(16),
        body2: createTypographyVariant(14),
        button: createTypographyVariant(14),
        caption: createTypographyVariant(12),
        overline: createTypographyVariant(12),
      },
    });

    return responsiveFontSizes(configuredTheme, { factor: 2 });
  }, [mode, highContrastMode, fontSize]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, highContrastMode, toggleHighContrast, fontSize, changeFontSize }}>
      <MUIThemeProvider theme={theme}>{children}</MUIThemeProvider>
    </ThemeContext.Provider>
  );
};
