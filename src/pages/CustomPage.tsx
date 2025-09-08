import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { videoCodecs } from 'livekit-client'
import { VideoConferenceClientImpl } from '../components/VideoConferenceClientImpl'
import { isVideoCodec } from '../lib/types'

export default function CustomPage() {
  const [searchParams] = useSearchParams()
  
  const liveKitUrl = searchParams.get('liveKitUrl')
  const token = searchParams.get('token')
  const codec = searchParams.get('codec')

  if (typeof liveKitUrl !== 'string') {
    return <h2>Missing LiveKit URL</h2>
  }
  if (typeof token !== 'string') {
    return <h2>Missing LiveKit token</h2>
  }
  if (codec !== null && !isVideoCodec(codec)) {
    return <h2>Invalid codec, if defined it has to be [{videoCodecs.join(', ')}].</h2>
  }

  return (
    <main data-lk-theme="default" style={{ height: '100%' }}>
      <VideoConferenceClientImpl liveKitUrl={liveKitUrl} token={token} codec={codec} />
    </main>
  )
}
