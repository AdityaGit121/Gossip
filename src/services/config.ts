// Service URL configuration for Web, Capacitor APK, and Chrome Extension

export const DEFAULT_SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || 
  (typeof window !== 'undefined' ? window.location.origin : '');

export const getBaseServerUrl = (): string => {
  if (typeof window === 'undefined') return '';

  // Check if custom server URL was saved in settings
  const customUrl = localStorage.getItem('gossip_server_url') || localStorage.getItem('convo_server_url');
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  const isExtension = window.location.protocol.startsWith('chrome-extension:');
  const isLocalhostWebview = window.location.hostname === 'localhost' && 
                            (window.location.port === '' || window.location.port === '80' || window.location.port === '443');

  // If running in Extension environment, we MUST use a remote server URL
  if (isExtension || isLocalhostWebview) {
    // Default hosted backend server URL for Extension deployment
    const fallbackServer = 'https://ais-dev-gv7k3cfrvwk3422rah5go5-95774560389.asia-southeast1.run.app';
    
    if (window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('chrome-extension')) {
      return window.location.origin;
    }
    return fallbackServer;
  }

  // Standard web browser deployment (same origin)
  return window.location.origin;
};

export const getApiUrl = (endpoint: string): string => {
  const baseUrl = getBaseServerUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  if (!baseUrl || baseUrl === window.location.origin) {
    return cleanEndpoint;
  }
  
  return `${baseUrl}${cleanEndpoint}`;
};
