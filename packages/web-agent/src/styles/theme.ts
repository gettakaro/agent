// Dark theme based on Takaro's lib-components theme
// Uses Takaro's purple primary color palette

export const customDarkTheme = {
  colors: {
    // Backgrounds - Takaro dark style
    background: '#080808',
    backgroundAlt: '#121212',
    backgroundAccent: '#353535',

    // Text
    text: '#c2c2c2',
    textAlt: '#818181',
    placeholder: '#6e7681',

    // Borders and dividers
    shade: '#252525',

    // Disabled state
    disabled: '#151515',

    // Primary - Takaro purple
    primary: '#664DE5',
    primaryShade: '#5340c4',
    secondary: '#3ccd6A',
    secondaryShade: '#32b85a',

    // Status colors - Takaro palette
    success: '#3ccd6A',
    warning: '#f57c00',
    error: '#ff4252',
    info: '#664de5',

    // White for contrast
    white: '#ffffff',
  },

  // Border radius
  borderRadius: {
    small: '4px',
    medium: '6px',
    large: '8px',
    round: '50%',
  },

  // Spacing
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
  },

  // Font sizes
  fontSize: {
    tiny: '0.75rem',
    small: '0.875rem',
    medium: '1rem',
    mediumLarge: '1.125rem',
    large: '1.25rem',
    huge: '1.5rem',
  },

  // Shadows
  elevation: {
    1: '0 1px 3px rgba(0, 0, 0, 0.3)',
    2: '0 4px 6px rgba(0, 0, 0, 0.3)',
    3: '0 10px 20px rgba(0, 0, 0, 0.3)',
  },
};

export type CustomTheme = typeof customDarkTheme;
