import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { encodePassphrase, generateRoomId, randomString } from '../lib/client-utils'

function Tabs(props: React.PropsWithChildren<{}>) {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabIndex = searchParams.get('tab') === 'custom' ? 1 : 0

  function onTabSelected(index: number) {
    const tab = index === 1 ? 'custom' : 'demo'
    setSearchParams({ tab })
  }

  let tabs = React.Children.map(props.children, (child, index) => {
    return (
      <button
        className={`px-6 py-3 font-satoshi font-medium text-sm transition-colors ${
          tabIndex === index
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        onClick={() => {
          if (onTabSelected) {
            onTabSelected(index)
          }
        }}
        aria-pressed={tabIndex === index}
      >
        {/* @ts-ignore */}
        {child?.props.label}
      </button>
    )
  })

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex border-b border-gray-200 mb-8">{tabs}</div>
      {/* @ts-ignore */}
      {props.children[tabIndex]}
    </div>
  )
}

function DemoMeetingTab(props: { label: string }) {
  const navigate = useNavigate()
  const [e2ee, setE2ee] = useState(false)
  const [sharedPassphrase, setSharedPassphrase] = useState(randomString(64))
  
  const startMeeting = () => {
    if (e2ee) {
      navigate(`/rooms/${generateRoomId()}#${encodePassphrase(sharedPassphrase)}`)
    } else {
      navigate(`/rooms/${generateRoomId()}`)
    }
  }
  
  return (
    <div className="py-8 px-6">
      <p className="text-gray-600 font-satoshi mb-6">Try LiveKit Meet for free with our live demo project.</p>
      <button 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-satoshi font-medium py-3 px-6 rounded-lg transition-colors mb-6" 
        onClick={startMeeting}
      >
        Start Meeting
      </button>
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <input
            id="use-e2ee"
            type="checkbox"
            checked={e2ee}
            onChange={(ev) => setE2ee(ev.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="use-e2ee" className="text-sm font-satoshi text-gray-700">Enable end-to-end encryption</label>
        </div>
        {e2ee && (
          <div className="flex flex-col space-y-2">
            <label htmlFor="passphrase" className="text-sm font-satoshi font-medium text-gray-700">Passphrase</label>
            <input
              id="passphrase"
              type="password"
              value={sharedPassphrase}
              onChange={(ev) => setSharedPassphrase(ev.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg font-satoshi focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function CustomConnectionTab(props: { label: string }) {
  const navigate = useNavigate()
  const [e2ee, setE2ee] = useState(false)
  const [sharedPassphrase, setSharedPassphrase] = useState(randomString(64))

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    const formData = new FormData(event.target as HTMLFormElement)
    const serverUrl = formData.get('serverUrl')
    const token = formData.get('token')
    if (e2ee) {
      navigate(
        `/custom?liveKitUrl=${serverUrl}&token=${token}#${encodePassphrase(sharedPassphrase)}`
      )
    } else {
      navigate(`/custom?liveKitUrl=${serverUrl}&token=${token}`)
    }
  }
  
  return (
    <form className="py-8 px-6 space-y-6" onSubmit={onSubmit}>
      <p className="text-gray-600 font-satoshi">
        Connect LiveKit Meet with a custom server using LiveKit Cloud or LiveKit Server.
      </p>
      <input
        id="serverUrl"
        name="serverUrl"
        type="url"
        placeholder="LiveKit Server URL: wss://*.livekit.cloud"
        required
        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-satoshi focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        id="token"
        name="token"
        placeholder="Token"
        required
        rows={5}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-satoshi focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <input
            id="use-e2ee-custom"
            type="checkbox"
            checked={e2ee}
            onChange={(ev) => setE2ee(ev.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="use-e2ee-custom" className="text-sm font-satoshi text-gray-700">Enable end-to-end encryption</label>
        </div>
        {e2ee && (
          <div className="flex flex-col space-y-2">
            <label htmlFor="passphrase-custom" className="text-sm font-satoshi font-medium text-gray-700">Passphrase</label>
            <input
              id="passphrase-custom"
              type="password"
              value={sharedPassphrase}
              onChange={(ev) => setSharedPassphrase(ev.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg font-satoshi focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      <hr className="border-gray-200" />
      <button
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-satoshi font-medium py-3 px-6 rounded-lg transition-colors"
        type="submit"
      >
        Connect
      </button>
    </form>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 font-satoshi" data-lk-theme="default">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <img 
            src="/images/livekit-meet-home.svg" 
            alt="LiveKit Meet" 
            className="mx-auto mb-8 h-12"
          />
          <h1 className="text-4xl font-satoshi font-bold text-gray-900 mb-6">
            LiveKit Meet
          </h1>
          <h2 className="text-xl font-satoshi text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Open source video conferencing app built on{' '}
            <a 
              href="https://github.com/livekit/components-js?ref=meet" 
              rel="noopener"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              LiveKit&nbsp;Components
            </a>
            ,{' '}
            <a 
              href="https://livekit.io/cloud?ref=meet" 
              rel="noopener"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              LiveKit&nbsp;Cloud
            </a>{' '}
            and React.
          </h2>
        </div>
        
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
          <Tabs>
            <DemoMeetingTab label="Demo" />
            <CustomConnectionTab label="Custom" />
          </Tabs>
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-8" data-lk-theme="default">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 font-satoshi">
            Hosted on{' '}
            <a 
              href="https://livekit.io/cloud?ref=meet" 
              rel="noopener"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              LiveKit Cloud
            </a>
            . Source code on{' '}
            <a 
              href="https://github.com/livekit/meet?ref=meet" 
              rel="noopener"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  )
}
