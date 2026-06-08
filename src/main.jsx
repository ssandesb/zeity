import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ZeitySyncProvider from './context/ZeitySyncProvider.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ZeitySyncProvider>
      <App />
    </ZeitySyncProvider>
  </React.StrictMode>,
)
