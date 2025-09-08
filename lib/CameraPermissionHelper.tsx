'use client';

import React from 'react';

export function CameraPermissionHelper() {
  const [permissionState, setPermissionState] = React.useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [showHelper, setShowHelper] = React.useState(false);

  React.useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      // Check if we have camera permission
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setPermissionState(result.state);
      
      if (result.state === 'denied' || result.state === 'prompt') {
        setShowHelper(true);
      }

      result.addEventListener('change', () => {
        setPermissionState(result.state);
        if (result.state === 'granted') {
          setShowHelper(false);
        }
      });
    } catch (error) {
      console.warn('Could not check camera permissions:', error);
      // Try to access camera directly to trigger permission prompt
      tryAccessCamera();
    }
  };

  const tryAccessCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setPermissionState('granted');
      setShowHelper(false);
      // Stop the stream immediately, we just wanted to check permissions
      stream.getTracks().forEach(track => track.stop());
    } catch (error: any) {
      console.warn('Camera access failed:', error);
      if (error.name === 'NotAllowedError') {
        setPermissionState('denied');
        setShowHelper(true);
      } else if (error.name === 'NotFoundError') {
        setShowHelper(true);
      }
    }
  };

  const requestPermission = async () => {
    await tryAccessCamera();
  };

  if (!showHelper) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#fff',
        border: '2px solid #4ecdc4',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1001,
        maxWidth: '400px',
        textAlign: 'center',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4ecdc4"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: '8px' }}
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </div>

      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333' }}>
        Camera toegang vereist
      </h3>

      <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666', lineHeight: '1.4' }}>
        {permissionState === 'denied' 
          ? 'Camera toegang is geweigerd. Klik op het slot-icoon in je adresbalk en sta camera toe.'
          : 'Voor video calls hebben we toegang tot je camera nodig.'
        }
      </p>

      {permissionState !== 'denied' && (
        <button
          onClick={requestPermission}
          style={{
            backgroundColor: '#4ecdc4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            fontSize: '14px',
            cursor: 'pointer',
            marginRight: '8px',
          }}
        >
          Camera toegang geven
        </button>
      )}

      <button
        onClick={() => setShowHelper(false)}
        style={{
          backgroundColor: 'transparent',
          color: '#666',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '8px 16px',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        Sluiten
      </button>

      <div style={{ marginTop: '12px', fontSize: '12px', color: '#999' }}>
        💡 Tip: Herlaad de pagina na het geven van toestemming
      </div>
    </div>
  );
}
