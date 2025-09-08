import * as React from 'react';
import { useRoomContext } from '@livekit/components-react';
import { setLogLevel, LogLevel, RemoteTrackPublication, setLogExtension } from 'livekit-client';
// @ts-ignore
import { tinykeys } from 'tinykeys';
import { datadogLogs } from '@datadog/browser-logs';


export const useDebugMode = ({ logLevel }: { logLevel?: LogLevel }) => {
  const room = useRoomContext();

  React.useEffect(() => {
    setLogLevel(logLevel ?? 'debug');

    if (process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN && process.env.NEXT_PUBLIC_DATADOG_SITE) {
      console.log('setting up datadog logs');
      datadogLogs.init({
        clientToken: process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN,
        site: process.env.NEXT_PUBLIC_DATADOG_SITE,
        forwardErrorsToLogs: true,
        sessionSampleRate: 100,
      });

      setLogExtension((level, msg, context) => {
        switch (level) {
          case LogLevel.debug:
            datadogLogs.logger.debug(msg, context);
            break;
          case LogLevel.info:
            datadogLogs.logger.info(msg, context);
            break;
          case LogLevel.warn:
            datadogLogs.logger.warn(msg, context);
            break;
          case LogLevel.error:
            datadogLogs.logger.error(msg, context);
            break;
          default:
            break;
        }
      });
    }

    // @ts-expect-error
    window.__lk_room = room;

    return () => {
      // @ts-expect-error
      window.__lk_room = undefined;
    };
  }, [room, logLevel]);
};

export const DebugMode = ({ logLevel }: { logLevel?: LogLevel }) => {
  const room = useRoomContext();
  const [isOpen, setIsOpen] = React.useState(false);
  const [, setRender] = React.useState({});
  const [roomSid, setRoomSid] = React.useState('');

  React.useEffect(() => {
    room.getSid().then(setRoomSid);
  }, [room]);

  useDebugMode({ logLevel });

  React.useEffect(() => {
    if (window) {
      const unsubscribe = tinykeys(window, {
        'Shift+D': () => {
          console.log('setting open');
          setIsOpen((open) => !open);
        },
      });

      // timer to re-render
      const interval = setInterval(() => {
        setRender({});
      }, 1000);

      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    }
  }, [isOpen]);

  if (typeof window === 'undefined' || !isOpen) {
    return null;
  }

  const handleSimulate = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    if (value == '') {
      return;
    }
    event.target.value = '';
    let isReconnect = false;
    switch (value) {
      case 'signal-reconnect':
        isReconnect = true;

      // fall through
      default:
        // @ts-expect-error
        room.simulateScenario(value);
    }
  };

  const lp = room.localParticipant;

  if (!isOpen) {
    return <></>;
  } else {
    return (
      <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-75 z-50 overflow-auto p-4">
        <div className="bg-white rounded-lg p-6 max-w-4xl mx-auto">
          <section id="room-info" className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Room Info {room.name}: {roomSid}
            </h3>
          </section>
        <details open className="mb-6">
          <summary className="cursor-pointer text-lg font-semibold text-gray-700 mb-3">
            <b>Local Participant: {lp.identity}</b>
          </summary>
          <details open className="mb-4 p-2 border border-gray-300 rounded">
            <summary className="cursor-pointer font-semibold text-gray-600 mb-2">
              <b>Published tracks</b>
            </summary>
            <div>
              {Array.from(lp.trackPublications.values()).map((t) => (
                <>
                  <div className="mb-2 p-2 bg-gray-50 rounded">
                    <i className="text-gray-600">
                      {t.source.toString()}
                      &nbsp;<span className="text-sm text-gray-500">{t.trackSid}</span>
                    </i>
                  </div>
                  <table className="w-full border-collapse border border-gray-300 mt-2 mb-4">
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="border border-gray-300 px-2 py-1 font-medium">Kind</td>
                        <td className="border border-gray-300 px-2 py-1">
                          {t.kind}&nbsp;
                          {t.kind === 'video' && (
                            <span>
                              {t.track?.dimensions?.width}x{t.track?.dimensions?.height}
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="border border-gray-300 px-2 py-1 font-medium">Bitrate</td>
                        <td className="border border-gray-300 px-2 py-1">{Math.ceil(t.track!.currentBitrate / 1000)} kbps</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              ))}
            </div>
          </details>
          <details open className="mb-4 p-2 border border-gray-300 rounded">
            <summary className="cursor-pointer font-semibold text-gray-600 mb-2">
              <b>Permissions</b>
            </summary>
            <div>
              <table className="w-full border-collapse border border-gray-300 mt-2">
                <tbody>
                  {lp.permissions &&
                    Object.entries(lp.permissions).map(([key, val]) => (
                      <>
                        <tr className="border-b border-gray-200">
                          <td className="border border-gray-300 px-2 py-1 font-medium">{key}</td>
                          {key !== 'canPublishSources' ? (
                            <td className="border border-gray-300 px-2 py-1">{val.toString()}</td>
                          ) : (
                            <td className="border border-gray-300 px-2 py-1"> {val.join(', ')} </td>
                          )}
                        </tr>
                      </>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        </details>

        <details className="mb-6">
          <summary className="cursor-pointer text-lg font-semibold text-gray-700 mb-3">
            <b>Remote Participants</b>
          </summary>
          {Array.from(room.remoteParticipants.values()).map((p) => (
            <details key={p.sid} className="mb-4 p-2 border border-gray-300 rounded">
              <summary className="cursor-pointer font-semibold text-gray-600 mb-2">
                <b>
                  {p.identity}
                  <span></span>
                </b>
              </summary>
              <div>
                {Array.from(p.trackPublications.values()).map((t) => (
                  <>
                    <div>
                      <i>
                        {t.source.toString()}
                        &nbsp;<span>{t.trackSid}</span>
                      </i>
                    </div>
                    <table>
                      <tbody>
                        <tr>
                          <td>Kind</td>
                          <td>
                            {t.kind}&nbsp;
                            {t.kind === 'video' && (
                              <span>
                                {t.dimensions?.width}x{t.dimensions?.height}
                              </span>
                            )}
                          </td>
                        </tr>
                      <tr className="border-b border-gray-200">
                        <td className="border border-gray-300 px-2 py-1 font-medium">Status</td>
                        <td className="border border-gray-300 px-2 py-1">{trackStatus(t)}</td>
                        </tr>
                        {t.track && (
                          <tr>
                            <td>Bitrate</td>
                            <td>{Math.ceil(t.track.currentBitrate / 1000)} kbps</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </>
                ))}
              </div>
            </details>
          ))}
        </details>
        </div>
      </div>
    );
  }
};

function trackStatus(t: RemoteTrackPublication): string {
  if (t.isSubscribed) {
    return t.isEnabled ? 'enabled' : 'disabled';
  } else {
    return 'unsubscribed';
  }
}
