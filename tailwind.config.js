/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Eco Express Nature Green Palette - Fresh & Natural
        'nature-light': {
          50: '#F1F8F4',
          100: '#C8E6C9', // Very light mint green
          200: '#C8E6C9',
          300: '#A5D6A7',
          400: '#81C784',
          500: '#C8E6C9',
          600: '#66BB6A',
          700: '#4CAF50',
          800: '#43A047',
          900: '#388E3C',
        },
        'nature-sage': {
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#4CAF50', // Vibrant nature green
          600: '#43A047',
          700: '#388E3C',
          800: '#2E7D32',
          900: '#1B5E20',
        },
        'nature-forest': {
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#2E7D32', // Forest green
          600: '#1B5E20',
          700: '#2E7D32',
          800: '#1B5E20',
          900: '#15531A',
        },
        'nature-deep': {
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#1B5E20', // Deep forest green
          600: '#15531A',
          700: '#124816',
          800: '#0F3D12',
          900: '#0C320E',
        },
        // Override default teal to use nature green
        teal: {
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#4CAF50',
          600: '#43A047',
          700: '#388E3C',
          800: '#2E7D32',
          900: '#1B5E20',
        },
      },
    },
  },
  plugins: [],
}

