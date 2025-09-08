'use client';
import * as React from 'react';
import { Track } from 'livekit-client';
import {
  useMaybeLayoutContext,
  MediaDeviceMenu,
  TrackToggle,
  useRoomContext,
  useIsRecording,
} from '@livekit/components-react';
import { CameraSettings } from './CameraSettings';
import { MicrophoneSettings } from './MicrophoneSettings';
import { DeviceErrorHandler } from './DeviceErrorHandler';
/**
 * @alpha
 */
export interface SettingsMenuProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * @alpha
 */
export function SettingsMenu(props: SettingsMenuProps) {
  const layoutContext = useMaybeLayoutContext();
  const room = useRoomContext();
  const recordingEndpoint = process.env.NEXT_PUBLIC_LK_RECORD_ENDPOINT;

  const settings = React.useMemo(() => {
    return {
      media: { camera: true, microphone: true, label: 'Media Devices', speaker: true },
      recording: recordingEndpoint ? { label: 'Recording' } : undefined,
    };
  }, []);

  const tabs = React.useMemo(
    () => Object.keys(settings).filter((t) => t !== undefined) as Array<keyof typeof settings>,
    [settings],
  );
  const [activeTab, setActiveTab] = React.useState(tabs[0]);

  const isRecording = useIsRecording();
  const [initialRecStatus, setInitialRecStatus] = React.useState(isRecording);
  const [processingRecRequest, setProcessingRecRequest] = React.useState(false);

  React.useEffect(() => {
    if (initialRecStatus !== isRecording) {
      setProcessingRecRequest(false);
    }
  }, [isRecording, initialRecStatus]);

  const toggleRoomRecording = async () => {
    if (!recordingEndpoint) {
      throw TypeError('No recording endpoint specified');
    }
    if (room.isE2EEEnabled) {
      throw Error('Recording of encrypted meetings is currently not supported');
    }
    setProcessingRecRequest(true);
    setInitialRecStatus(isRecording);
    let response: Response;
    if (isRecording) {
      response = await fetch(recordingEndpoint + `/stop?roomName=${room.name}`);
    } else {
      response = await fetch(recordingEndpoint + `/start?roomName=${room.name}`);
    }
    if (response.ok) {
    } else {
      console.error(
        'Error handling recording request, check server logs:',
        response.status,
        response.statusText,
      );
      setProcessingRecRequest(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 w-full relative" {...props}>
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map(
          (tab) =>
            settings[tab] && (
              <button
                className={`px-4 py-2 mr-2 rounded-t-lg font-medium transition-colors ${
                  tab === activeTab 
                    ? 'bg-blue-500 text-white border-b-2 border-blue-500' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-pressed={tab === activeTab}
              >
                {
                  // @ts-ignore
                  settings[tab].label
                }
              </button>
            ),
        )}
      </div>
      <div className="space-y-6">
        {activeTab === 'media' && (
          <>
            {settings.media && settings.media.camera && (
              <>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800">Camera</h3>
                  <section className="bg-gray-50 p-4 rounded-lg">
                    <CameraSettings />
                  </section>
                </div>
              </>
            )}
            {settings.media && settings.media.microphone && (
              <>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800">Microphone</h3>
                  <section className="bg-gray-50 p-4 rounded-lg">
                    <MicrophoneSettings />
                  </section>
                </div>
              </>
            )}
            {settings.media && settings.media.speaker && (
              <>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800">Speaker & Headphones</h3>
                  <section className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700">Audio Output</span>
                      <div className="flex-1">
                        <DeviceErrorHandler>
                          <MediaDeviceMenu kind="audiooutput"></MediaDeviceMenu>
                        </DeviceErrorHandler>
                      </div>
                    </div>
                  </section>
                </div>
              </>
            )}
          </>
        )}
        {activeTab === 'recording' && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">Record Meeting</h3>
            <section className="bg-gray-50 p-4 rounded-lg space-y-4">
              <p className="text-sm text-gray-600">
                {isRecording
                  ? 'Meeting is currently being recorded'
                  : 'No active recordings for this meeting'}
              </p>
              <button 
                disabled={processingRecRequest} 
                onClick={() => toggleRoomRecording()}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {processingRecRequest ? 'Processing...' : `${isRecording ? 'Stop' : 'Start'} Recording`}
              </button>
            </section>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
        <button
          className={`lk-button`}
          onClick={() => layoutContext?.widget.dispatch?.({ msg: 'toggle_settings' })}
        >
          Close
        </button>
      </div>
    </div>
  );
}
