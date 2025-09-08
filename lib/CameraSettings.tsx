import React from 'react';
import {
  MediaDeviceMenu,
  TrackReference,
  TrackToggle,
  useLocalParticipant,
  VideoTrack,
} from '@livekit/components-react';
// Import track processors dynamically to avoid SSR issues
let BackgroundBlur: any;
let VirtualBackground: any;

if (typeof window !== 'undefined') {
  import('@livekit/track-processors').then((module) => {
    BackgroundBlur = module.BackgroundBlur;
    VirtualBackground = module.VirtualBackground;
  });
}
import { isLocalTrack, LocalTrackPublication, Track } from 'livekit-client';
import { DeviceErrorHandler, useDeviceErrorSuppression } from './DeviceErrorHandler';
import Desk from '../public/background-images/samantha-gades-BlIhVfXbi9s-unsplash.jpg';
import Nature from '../public/background-images/ali-kazal-tbw_KQE3Cbg-unsplash.jpg';

// Background image paths
const BACKGROUND_IMAGES = [
  { name: 'Desk', path: Desk },
  { name: 'Nature', path: Nature },
];

// Background options
type BackgroundType = 'none' | 'blur' | 'image';

export function CameraSettings() {
  const { cameraTrack, localParticipant } = useLocalParticipant();
  
  // Suppress device-related console errors
  useDeviceErrorSuppression();
  
  // Track if processors are loaded
  const [processorsLoaded, setProcessorsLoaded] = React.useState(false);
  
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@livekit/track-processors').then((module) => {
        BackgroundBlur = module.BackgroundBlur;
        VirtualBackground = module.VirtualBackground;
        setProcessorsLoaded(true);
      }).catch(() => {
        console.warn('Failed to load track processors, background effects disabled');
      });
    }
  }, []);
  const [backgroundType, setBackgroundType] = React.useState<BackgroundType>(
    (cameraTrack as LocalTrackPublication)?.track?.getProcessor()?.name === 'background-blur'
      ? 'blur'
      : (cameraTrack as LocalTrackPublication)?.track?.getProcessor()?.name === 'virtual-background'
        ? 'image'
        : 'none',
  );

  const [virtualBackgroundImagePath, setVirtualBackgroundImagePath] = React.useState<string | null>(
    null,
  );

  const camTrackRef: TrackReference | undefined = React.useMemo(() => {
    return cameraTrack
      ? { participant: localParticipant, publication: cameraTrack, source: Track.Source.Camera }
      : undefined;
  }, [localParticipant, cameraTrack]);

  const selectBackground = (type: BackgroundType, imagePath?: string) => {
    setBackgroundType(type);
    if (type === 'image' && imagePath) {
      setVirtualBackgroundImagePath(imagePath);
    } else if (type !== 'image') {
      setVirtualBackgroundImagePath(null);
    }
  };

  React.useEffect(() => {
    if (isLocalTrack(cameraTrack?.track)) {
      if (backgroundType === 'blur' && BackgroundBlur) {
        cameraTrack.track?.setProcessor(BackgroundBlur());
      } else if (backgroundType === 'image' && virtualBackgroundImagePath && VirtualBackground) {
        cameraTrack.track?.setProcessor(VirtualBackground(virtualBackgroundImagePath));
      } else {
        cameraTrack.track?.stopProcessor();
      }
    }
  }, [cameraTrack, backgroundType, virtualBackgroundImagePath]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {camTrackRef && (
        <VideoTrack
          style={{
            maxHeight: '280px',
            objectFit: 'contain',
            objectPosition: 'right',
            transform: 'scaleX(-1)',
          }}
          trackRef={camTrackRef}
        />
      )}

      <section className="lk-button-group">
        <TrackToggle source={Track.Source.Camera}>Camera</TrackToggle>
        <div className="lk-button-group-menu">
          <DeviceErrorHandler>
            <MediaDeviceMenu kind="videoinput" />
          </DeviceErrorHandler>
        </div>
      </section>

      {processorsLoaded && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ marginBottom: '8px' }}>Background Effects</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => selectBackground('none')}
            className="lk-button"
            aria-pressed={backgroundType === 'none'}
            style={{
              border: backgroundType === 'none' ? '2px solid #0090ff' : '1px solid #d1d1d1',
              minWidth: '80px',
            }}
          >
            None
          </button>

          <button
            onClick={() => selectBackground('blur')}
            className="lk-button"
            aria-pressed={backgroundType === 'blur'}
            style={{
              border: backgroundType === 'blur' ? '2px solid #0090ff' : '1px solid #d1d1d1',
              minWidth: '80px',
              backgroundColor: '#f0f0f0',
              position: 'relative',
              overflow: 'hidden',
              height: '60px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#e0e0e0',
                filter: 'blur(8px)',
                zIndex: 0,
              }}
            />
            <span
              style={{
                position: 'relative',
                zIndex: 1,
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: '2px 5px',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              Blur
            </span>
          </button>

          {BACKGROUND_IMAGES.map((image) => (
            <button
              key={image.path.src}
              onClick={() => selectBackground('image', image.path.src)}
              className="lk-button"
              aria-pressed={
                backgroundType === 'image' && virtualBackgroundImagePath === image.path.src
              }
              style={{
                backgroundImage: `url(${image.path.src})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                width: '80px',
                height: '60px',
                border:
                  backgroundType === 'image' && virtualBackgroundImagePath === image.path.src
                    ? '2px solid #0090ff'
                    : '1px solid #d1d1d1',
              }}
            >
              <span
                style={{
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                {image.name}
              </span>
            </button>
          ))}
          </div>
        </div>
      )}
      
      {!processorsLoaded && typeof window !== 'undefined' && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
          Background effects laden...
        </div>
      )}
    </div>
  );
}
