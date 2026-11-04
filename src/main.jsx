import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Admin from './Admin'
import { IS_ADMIN } from './lib'
import './styles.css'
createRoot(document.getElementById('root')).render(IS_ADMIN ? <Admin /> : <App />)
