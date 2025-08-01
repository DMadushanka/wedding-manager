import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext();

export const themes = {
  light: {
    primary: '#4ECDC4',
    secondary: '#FF6B6B',
    accent: '#6B5B95',
    background: '#e0b3ff',
    text: '#333333',
    cardBackground: '#ffffff',
    borderColor: '#cccccc',
    success: '#4CAF50',
    error: '#FF6B6B',
    warning: '#FFBE0B',
  },
  dark: {
    primary: '#45B7AF',
    secondary: '#E55C5C',
    accent: '#5A4A7A',
    background: '#2C2C2C',
    text: '#FFFFFF',
    cardBackground: '#3D3D3D',
    borderColor: '#555555',
    success: '#45A049',
    error: '#E55C5C',
    warning: '#E5A800',
  },
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('light');

  const toggleTheme = () => {
    setCurrentTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme: themes[currentTheme],
    currentTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 