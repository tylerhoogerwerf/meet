'use client';

import React from 'react';

interface DeviceErrorHandlerProps {
  children: React.ReactNode;
}

interface DeviceErrorState {
  hasError: boolean;
  error?: Error;
}

export class DeviceErrorHandler extends React.Component<DeviceErrorHandlerProps, DeviceErrorState> {
  constructor(props: DeviceErrorHandlerProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): DeviceErrorState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log device-related errors but don't crash the app
    if (error.message.includes('Requested device not found') || 
        error.message.includes('NotFoundError') ||
        error.message.includes('NotAllowedError') ||
        error.message.includes('mediaDevicesError')) {
      console.warn('Device access error (this is usually normal):', error.message);
      return;
    }
    
    console.error('Device error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      
      // Handle device-specific errors gracefully
      if (error?.message.includes('Requested device not found') ||
          error?.message.includes('NotFoundError')) {
        return (
          <div className="device-error-fallback">
            <p style={{ fontSize: '14px', color: '#666' }}>
              Geen camera/microfoon gevonden. Controleer je apparaat instellingen.
            </p>
          </div>
        );
      }

      if (error?.message.includes('NotAllowedError')) {
        return (
          <div className="device-error-fallback">
            <p style={{ fontSize: '14px', color: '#666' }}>
              Camera/microfoon toegang geweigerd. Klik op het slot icoon in je browser om toestemming te geven.
            </p>
          </div>
        );
      }

      // For other errors, show generic message
      return (
        <div className="device-error-fallback">
          <p style={{ fontSize: '14px', color: '#666' }}>
            Er is een probleem met je media apparaten. Probeer de pagina te vernieuwen.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook to suppress device errors in console
export function useDeviceErrorSuppression() {
  React.useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      const message = args[0]?.toString() || '';
      
      // Suppress common device-related errors that are not critical
      if (message.includes('Requested device not found') ||
          message.includes('NotFoundError') ||
          message.includes('NotAllowedError') ||
          message.includes('mediaDevicesError') ||
          message.includes('Krisp hook: error') ||
          message.includes('AudioWorkletNode cannot be created') ||
          message.includes('InvalidStateError') ||
          message.includes('Failed to parse source map') ||
          message.includes('vision_bundle')) {
        return; // Don't log these errors
      }
      
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args[0]?.toString() || '';
      
      // Suppress MediaPipe warnings
      if (message.includes('Failed to parse source map') ||
          message.includes('@mediapipe') ||
          message.includes('vision_bundle')) {
        return; // Don't log these warnings
      }
      
      originalWarn.apply(console, args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);
}
