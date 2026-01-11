import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ThemeContext from '../../context/ThemeContext';
import ThemeToggle from '../ThemeToggle';

describe('ThemeToggle', () => {
  it('renders correctly and calls toggleTheme on click', () => {
    const toggleTheme = jest.fn();
    const isDark = false;

    const { getByText } = render(
      <ThemeContext.Provider value={{ isDark, toggleTheme }}>
        <ThemeToggle />
      </ThemeContext.Provider>
    );

    const button = getByText('🌙');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('displays the sun icon when in dark mode', () => {
    const toggleTheme = jest.fn();
    const isDark = true;

    const { getByText } = render(
      <ThemeContext.Provider value={{ isDark, toggleTheme }}>
        <ThemeToggle />
      </ThemeContext.Provider>
    );

    const button = getByText('☀️');
    expect(button).toBeInTheDocument();
  });
});
