/** @type {import('tailwindcss').Config} */
// Use path.sep so no backslash string literal is needed — fast-glob requires forward slashes.
const path = require('path');
const dir = __dirname.split(path.sep).join('/');

module.exports = {
  content: [`${dir}/src/**/*.{js,ts,jsx,tsx,mdx}`],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        sidebar: '#0f0f0f',
        surface: '#141414',
        'surface-2': '#1c1c1c',
        border: 'rgba(255,255,255,0.08)',
        'border-strong': 'rgba(255,255,255,0.16)',
        accent: '#f59e0b',
        'accent-hover': '#d97706',
        'text-muted': '#6b7280',
        'text-faint': '#374151',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
