import { NextRequest, NextResponse } from 'next/server';
import { ConnectionDetails } from '@/lib/types';
import { randomString } from '@/lib/client-utils';
import { getLiveKitURL } from '@/lib/getLiveKitURL';
import { AccessToken, AccessTokenOptions, VideoGrant } from 'livekit-server-sdk';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

// Fallback to direct LiveKit for guest access (30 minutes)
const API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';

const COOKIE_KEY = 'random-participant-postfix';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const roomName = request.nextUrl.searchParams.get('roomName');
    const participantName = request.nextUrl.searchParams.get('participantName');
    const region = request.nextUrl.searchParams.get('region');

    if (typeof roomName !== 'string') {
      return new NextResponse('Missing required query parameter: roomName', { status: 400 });
    }
    if (participantName === null) {
      return new NextResponse('Missing required query parameter: participantName', { status: 400 });
    }

    // Check for authorization header
    const authHeader = request.headers.get('authorization');
    
    if (authHeader) {
      // Try authenticated route first
      try {
        const backendResponse = await fetch(`${BACKEND_URL}/api/rooms/${roomName}/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            room_name: roomName,
            name: participantName,
            can_publish: true,
            can_subscribe: true,
            can_record: false,
          }),
        });

        if (backendResponse.ok) {
          const tokenData = await backendResponse.json();
          const data: ConnectionDetails = {
            serverUrl: tokenData.server_url,
            roomName: tokenData.room_name,
            participantToken: tokenData.token,
            participantName: tokenData.name,
          };

          return new NextResponse(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        console.warn('Authenticated route failed, falling back to guest access:', error);
      }
    }

    // Fallback to guest access (30 minutes max)
    console.log('Using guest access for room:', roomName);
    
    if (!LIVEKIT_URL) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    
    const livekitServerUrl = region ? getLiveKitURL(LIVEKIT_URL, region) : LIVEKIT_URL;
    let randomParticipantPostfix = request.cookies.get(COOKIE_KEY)?.value;
    
    if (livekitServerUrl === undefined) {
      throw new Error('Invalid region');
    }

    // Generate participant token with 30 minute limit
    if (!randomParticipantPostfix) {
      randomParticipantPostfix = randomString(4);
    }
    
    const participantToken = await createGuestParticipantToken(
      {
        identity: `guest_${participantName}__${randomParticipantPostfix}`,
        name: `${participantName} (Guest)`,
        metadata: JSON.stringify({ 
          guest: true, 
          maxDuration: 30 * 60 * 1000, // 30 minutes in ms
          joinedAt: Date.now() 
        }),
      },
      roomName,
    );

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: livekitServerUrl,
      roomName: roomName,
      participantToken: participantToken,
      participantName: `${participantName} (Guest)`,
    };
    
    return new NextResponse(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `${COOKIE_KEY}=${randomParticipantPostfix}; Path=/; HttpOnly; SameSite=Strict; Secure; Expires=${getCookieExpirationTime()}`,
      },
    });
  } catch (error) {
    console.error('Connection details error:', error);
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
}

function createGuestParticipantToken(userInfo: AccessTokenOptions, roomName: string) {
  const at = new AccessToken(API_KEY, API_SECRET, userInfo);
  at.ttl = '30m'; // 30 minutes for guest access
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: false, // Guests can't publish data
    canSubscribe: true,
  };
  at.addGrant(grant);
  return at.toJwt();
}

function getCookieExpirationTime(): string {
  var now = new Date();
  var time = now.getTime();
  var expireTime = time + 30 * 60 * 1000; // 30 minutes
  now.setTime(expireTime);
  return now.toUTCString();
}
