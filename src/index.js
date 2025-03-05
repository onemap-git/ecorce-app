// src/index.js (example)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 1. Import MUI theme utilities
import { createTheme, ThemeProvider } from '@mui/material/styles';

// 2. Create a custom theme specifying the font
const theme = createTheme({
  typography: {
    fontFamily: 'Space Grotesk, sans-serif',
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* 3. Wrap your entire app in ThemeProvider */}
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
