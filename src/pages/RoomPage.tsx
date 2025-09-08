import React from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { PageClientImpl } from '../components/PageClientImpl'
import { isVideoCodec } from '../lib/types'

export default function RoomPage() {
  const { roomName } = useParams<{ roomName: string }>()
  const [searchParams] = useSearchParams()
  
  const codec = 
    typeof searchParams.get('codec') === 'string' && isVideoCodec(searchParams.get('codec')!)
      ? searchParams.get('codec')!
      : 'vp9'
  const hq = searchParams.get('hq') === 'true'
  const region = searchParams.get('region') || undefined

  if (!roomName) {
    return <div>Room name is required</div>
  }

  return (
    <PageClientImpl
      roomName={roomName}
      region={region}
      hq={hq}
      codec={codec}
    />
  )
}
