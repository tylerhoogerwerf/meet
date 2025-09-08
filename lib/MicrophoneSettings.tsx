import React from 'react';
import { useKrispNoiseFilter } from '@livekit/components-react/krisp';
import { TrackToggle } from '@livekit/components-react';
import { MediaDeviceMenu } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { isLowPowerDevice } from './client-utils';
import { DeviceErrorHandler, useDeviceErrorSuppression } from './DeviceErrorHandler';

export function MicrophoneSettings() {
  // Suppress device-related console errors
  useDeviceErrorSuppression();
  
  // Check if we're in a guest session (disable Krisp for guests to avoid errors)
  const isGuestSession = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      // Check if we have guest metadata or no authentication
      const hasAuth = localStorage.getItem('access_token');
      return !hasAuth; // If no auth token, assume guest
    } catch {
      return true; // If localStorage fails, assume guest
    }
  }, []);
  
  const { isNoiseFilterEnabled, setNoiseFilterEnabled, isNoiseFilterPending } = useKrispNoiseFilter(
    {
      filterOptions: {
        bufferOverflowMs: 100,
        bufferDropMs: 200,
        quality: isLowPowerDevice() ? 'low' : 'medium',
        onBufferDrop: () => {
          console.warn(
            'krisp buffer dropped, noise filter versions >= 0.3.2 will automatically disable the filter',
          );
        },
      },
      // Disable Krisp for guest sessions to prevent errors
      disabled: isGuestSession,
    },
  );

  React.useEffect(() => {
    // enable Krisp by default on non-low power devices, but not for guests
    if (!isGuestSession) {
      setNoiseFilterEnabled(!isLowPowerDevice());
    }
  }, [isGuestSession]);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '10px',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <section className="lk-button-group">
        <TrackToggle source={Track.Source.Microphone}>Microphone</TrackToggle>
        <div className="lk-button-group-menu">
          <DeviceErrorHandler>
            <MediaDeviceMenu kind="audioinput" />
          </DeviceErrorHandler>
        </div>
      </section>

      {!isGuestSession && (
        <button
          className="lk-button"
          onClick={() => setNoiseFilterEnabled(!isNoiseFilterEnabled)}
          disabled={isNoiseFilterPending}
          aria-pressed={isNoiseFilterEnabled}
        >
          {isNoiseFilterEnabled ? 'Disable' : 'Enable'} Enhanced Noise Cancellation
        </button>
      )}
      
      {isGuestSession && (
        <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
          Noise cancellation niet beschikbaar voor gasten
        </div>
      )}
    </div>
  );
}
