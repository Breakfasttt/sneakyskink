import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootNodeModules = path.resolve(__dirname, '../node_modules')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@mui/icons-material',
        replacement: path.resolve(rootNodeModules, '@mui/icons-material/index.js'),
      },
      {
        find: 'recharts',
        replacement: path.resolve(rootNodeModules, 'recharts'),
      },
      {
        find: 'react',
        replacement: path.resolve(rootNodeModules, 'react'),
      },
      {
        find: 'react-dom',
        replacement: path.resolve(rootNodeModules, 'react-dom'),
      },
      {
        find: '@emotion/react',
        replacement: path.resolve(rootNodeModules, '@emotion/react'),
      },
      {
        find: '@emotion/styled',
        replacement: path.resolve(rootNodeModules, '@emotion/styled'),
      },
      {
        find: '@mui/material',
        replacement: path.resolve(rootNodeModules, '@mui/material'),
      },
    ]
  }
})
