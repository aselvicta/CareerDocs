import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import logoUrl from './assets/logo.png'

let favicon = document.querySelector("link[rel='icon']")
if (!favicon) {
  favicon = document.createElement('link')
  favicon.rel = 'icon'
  favicon.type = 'image/png'
  document.head.appendChild(favicon)
}
favicon.href = logoUrl

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
