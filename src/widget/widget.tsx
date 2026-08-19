import React from 'react'
import ReactDOM from 'react-dom/client'
import ChatWidget from './ChatWidget'
import '../App.css'

// Widget initialization function
function initPBMPChatWidget(config?: {
  apiEndpoint?: string;
  position?: 'bottom-right' | 'bottom-left';
  containerId?: string;
}) {
  const {
    apiEndpoint,
    position = 'bottom-right',
    containerId = 'pbmp-chat-widget-container'
  } = config || {};

  // Check if widget already exists
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);
  }

  // Clear any existing content
  container.innerHTML = '';

  // Create root and render widget
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <ChatWidget apiEndpoint={apiEndpoint} position={position} />
    </React.StrictMode>
  );

  return {
    destroy: () => {
      root.unmount();
      container?.remove();
    }
  };
}

// Auto-initialize if script tag has data attributes
if (typeof window !== 'undefined') {
  // Make init function available globally
  (window as any).initPBMPChatWidget = initPBMPChatWidget;

  // Auto-initialize from script tag data attributes
  const scriptTag = document.querySelector('script[data-pbmp-chat]');
  if (scriptTag) {
    const apiEndpoint = scriptTag.getAttribute('data-api-endpoint') || undefined;
    const position = (scriptTag.getAttribute('data-position') as 'bottom-right' | 'bottom-left') || 'bottom-right';
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initPBMPChatWidget({ apiEndpoint, position });
      });
    } else {
      initPBMPChatWidget({ apiEndpoint, position });
    }
  }
}

export default initPBMPChatWidget;
