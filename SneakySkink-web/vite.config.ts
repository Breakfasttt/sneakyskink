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
        replacement: path.resolve(__dirname, 'node_modules/@mui/icons-material/index.js'),
      },
      {
        find: 'recharts',
        replacement: path.resolve(rootNodeModules, 'recharts'),
      },
    ]
  }
})
