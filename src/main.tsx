import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import VoicePwa from './voice/VoicePwa.tsx'
import MediaPwa from './media/MediaPwa.tsx'

const pathname = window.location.pathname;
const isVoicePwa = pathname.startsWith('/voice')
const isMediaPwa = pathname.startsWith('/media')

if (!isVoicePwa && !isMediaPwa) {
  void import('./App.css')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isVoicePwa ? <VoicePwa /> : isMediaPwa ? <MediaPwa /> : <App />}
  </React.StrictMode>,
)

