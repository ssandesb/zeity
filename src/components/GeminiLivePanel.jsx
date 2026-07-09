import { useRef, useState } from 'react'
import {
  Camera,
  CameraOff,
  Languages,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Radio,
  Send,
  Settings2,
  Sparkles,
  Volume2,
} from 'lucide-react'
import { useGeminiLive } from '../hooks/useGeminiLive'

const MODES = [
  { id: 'conversation', label: 'Live chat', icon: Sparkles },
  { id: 'translate', label: 'Translate', icon: Languages },
]

const THINKING_LEVELS = [
  { id: 'minimal', label: 'Fast' },
  { id: 'low', label: 'Light' },
  { id: 'medium', label: 'Balanced' },
  { id: 'high', label: 'Deep' },
]

const LANGUAGES = [
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ne', label: 'Nepali' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
]

export default function GeminiLivePanel() {
  const [mode, setMode] = useState('conversation')
  const [thinkingLevel, setThinkingLevel] = useState('minimal')
  const [targetLanguage, setTargetLanguage] = useState('es')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [text, setText] = useState('')
  const textRef = useRef(null)

  const {
    status,
    error,
    inputTranscript,
    outputTranscript,
    transcriptLog,
    micOn,
    cameraOn,
    goAway,
    videoElRef,
    connect,
    disconnect,
    sendText,
    toggleMic,
    toggleCamera,
    isConnected,
    isBusy,
  } = useGeminiLive()

  const handleConnect = () => {
    connect({
      mode,
      thinkingLevel,
      targetLanguage: mode === 'translate' ? targetLanguage : undefined,
    })
  }

  const handleSend = () => {
    const v = text.trim()
    if (!v) return
    sendText(v)
    setText('')
    textRef.current?.focus()
  }

  const statusLabel =
    status === 'connected'
      ? 'Live'
      : status === 'connecting'
        ? 'Connecting…'
        : status === 'error'
          ? 'Error'
          : 'Offline'

  return (
    <section className="glive panel" aria-label="Gemini Live">
      <div className="glive-head">
        <div className="glive-head-left">
          <div className="glive-icon-wrap">
            <Radio size={18} strokeWidth={2.2} />
            <span className={`glive-pulse ${isConnected ? 'on' : ''}`} aria-hidden />
          </div>
          <div>
            <h2 className="glive-title">Gemini Live</h2>
            <p className="glive-sub">
              Real-time voice, text, camera & translation — powered by Google Live API
            </p>
          </div>
        </div>
        <div className="glive-status-wrap">
          <span className={`glive-status ${status}`}>{statusLabel}</span>
          <button
            type="button"
            className="glive-settings-btn"
            onClick={() => setSettingsOpen((o) => !o)}
            aria-expanded={settingsOpen}
            title="Settings"
          >
            <Settings2 size={16} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="glive-modes">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`glive-mode ${mode === id ? 'active' : ''}`}
            onClick={() => setMode(id)}
            disabled={isConnected || isBusy}
          >
            <Icon size={15} strokeWidth={2.2} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {settingsOpen && (
        <div className="glive-settings">
          {mode === 'translate' ? (
            <p className="glive-hint">
              <Volume2 size={13} strokeWidth={2.2} />
              Translate mode: speak in any language — Gemini replies in your target language. Tap Mic to start.
            </p>
          ) : (
            <label className="glive-setting">
              <span>Thinking</span>
              <select
                value={thinkingLevel}
                onChange={(e) => setThinkingLevel(e.target.value)}
                disabled={isConnected}
              >
                {THINKING_LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === 'translate' && (
            <label className="glive-setting">
              <span>Target language</span>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                disabled={isConnected}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === 'conversation' && (
            <p className="glive-hint">
              <Volume2 size={13} strokeWidth={2.2} />
              After connecting, tap Mic and speak — or type below. Use headphones to avoid echo.
            </p>
          )}
        </div>
      )}

      {error && <div className="glive-error">{error}</div>}
      {goAway && (
        <div className="glive-warn">
          Session ending soon — reconnect to continue.
        </div>
      )}

      <div className="glive-body">
        <div className="glive-main-col">
          <div className="glive-transcript panel">
            <div className="glive-transcript-live">
              {inputTranscript && (
                <p className="glive-line user live">
                  <span className="glive-role">You</span>
                  {inputTranscript}
                </p>
              )}
              {outputTranscript && (
                <p className="glive-line assistant live">
                  <span className="glive-role">Gemini</span>
                  {outputTranscript}
                </p>
              )}
              {!inputTranscript && !outputTranscript && transcriptLog.length === 0 && (
                <p className="glive-empty">
                  {isConnected
                    ? 'Speak, type, or turn on the camera — Gemini responds in real time.'
                    : 'Connect to start a live session with voice, text, or video.'}
                </p>
              )}
            </div>
            {transcriptLog.length > 0 && (
              <div className="glive-transcript-log">
                {transcriptLog.map((entry, i) => (
                  <p key={`${entry.at}-${i}`} className={`glive-line ${entry.role}`}>
                    <span className="glive-role">{entry.role === 'user' ? 'You' : 'Gemini'}</span>
                    {entry.text}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="glive-input-row">
            <input
              ref={textRef}
              type="text"
              className="glive-text-input"
              placeholder={isConnected ? 'Type a message…' : 'Connect first to send text'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSend()
                }
              }}
              disabled={!isConnected}
            />
            <button
              type="button"
              className="btn-primary glive-send"
              onClick={handleSend}
              disabled={!isConnected || !text.trim()}
              title="Send text"
            >
              <Send size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className="glive-side-col">
          <div className={`glive-video-wrap ${cameraOn ? 'on' : ''}`}>
            <video ref={videoElRef} className="glive-video" playsInline muted />
            {!cameraOn && (
              <div className="glive-video-placeholder">
                <Camera size={28} strokeWidth={1.8} />
                <span>Camera off</span>
              </div>
            )}
          </div>

          <div className="glive-controls">
            {!isConnected ? (
              <button
                type="button"
                className="btn-primary glive-connect"
                onClick={handleConnect}
                disabled={isBusy}
              >
                {isBusy ? (
                  <Loader2 size={17} className="spin" />
                ) : (
                  <Phone size={17} strokeWidth={2.2} />
                )}
                <span>{isBusy ? 'Connecting…' : 'Connect'}</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={`glive-ctrl ${micOn ? 'active' : ''}`}
                  onClick={toggleMic}
                  title={micOn ? 'Mute mic' : 'Unmute mic'}
                >
                  {micOn ? <Mic size={18} strokeWidth={2.2} /> : <MicOff size={18} strokeWidth={2.2} />}
                  <span>{micOn ? 'Mic on' : 'Mic'}</span>
                </button>
                <button
                  type="button"
                  className={`glive-ctrl ${cameraOn ? 'active' : ''}`}
                  onClick={toggleCamera}
                  title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
                >
                  {cameraOn ? (
                    <Camera size={18} strokeWidth={2.2} />
                  ) : (
                    <CameraOff size={18} strokeWidth={2.2} />
                  )}
                  <span>{cameraOn ? 'Cam on' : 'Camera'}</span>
                </button>
                <button
                  type="button"
                  className="glive-ctrl danger"
                  onClick={disconnect}
                  title="Disconnect"
                >
                  <PhoneOff size={18} strokeWidth={2.2} />
                  <span>End</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
