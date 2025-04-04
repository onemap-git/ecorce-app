import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { PricingProvider } from './contexts/PricingContext';

const theme = createTheme({
  typography: {
    fontFamily: 'Space Grotesk, sans-serif',
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          maxWidth: 'none !important',
        },
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <PricingProvider>
        <App />
      </PricingProvider>
    </ThemeProvider>
  </React.StrictMode>
);
