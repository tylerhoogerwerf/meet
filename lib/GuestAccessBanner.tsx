'use client';

import React from 'react';
import { useLocalParticipant } from '@livekit/components-react';

export function GuestAccessBanner() {
  const { localParticipant } = useLocalParticipant();
  const [timeRemaining, setTimeRemaining] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!localParticipant?.metadata) return;

    try {
      const metadata = JSON.parse(localParticipant.metadata);
      if (metadata.guest && metadata.joinedAt && metadata.maxDuration) {
        const joinedAt = metadata.joinedAt;
        const maxDuration = metadata.maxDuration;
        const endTime = joinedAt + maxDuration;

        const updateTimer = () => {
          const now = Date.now();
          const remaining = Math.max(0, endTime - now);
          setTimeRemaining(remaining);

          if (remaining <= 0) {
            // Session expired
            window.location.reload();
          }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
      }
    } catch (error) {
      console.warn('Failed to parse participant metadata:', error);
    }
  }, [localParticipant?.metadata]);

  if (timeRemaining === null) return null;

  const minutes = Math.floor(timeRemaining / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

  const isLowTime = minutes < 5;

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: isLowTime ? '#ff6b6b' : '#4ecdc4',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: 1000,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
      </svg>
      
      <span>
        Guest toegang - {minutes}:{seconds.toString().padStart(2, '0')} resterend
      </span>
      
      {isLowTime && (
        <span style={{ fontSize: '12px', opacity: 0.9 }}>
          (Log in voor onbeperkte toegang)
        </span>
      )}
    </div>
  );
}
