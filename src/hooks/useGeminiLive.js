import { useCallback, useRef, useState } from 'react'
import {
  AudioPlaybackQueue,
  MicCapture,
  captureVideoFrame,
} from '../utils/geminiLiveAudio'

export const MODEL_CONVERSATION = 'gemini-3.1-flash-live-preview'
export const MODEL_TRANSLATE = 'gemini-3.5-live-translate-preview'

const DEFAULT_SYSTEM =
  'You are Zeity\'s future-self coach — warm, concise, and encouraging. Help the user explore habits, goals, and what their future could look like. Keep answers practical and motivating.'

function buildConfig({ mode, thinkingLevel, targetLanguage, systemPrompt }) {
  const isTranslate = mode === 'translate'
  const config = {
    responseModalities: ['AUDIO'],
    systemInstruction: {
      parts: [{ text: systemPrompt || DEFAULT_SYSTEM }],
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: {
      automaticActivityDetection: { disabled: false },
    },
    thinkingConfig: {
      thinkingLevel: thinkingLevel || 'minimal',
    },
    contextWindowCompression: {},
    sessionResumption: {},
  }

  if (isTranslate && targetLanguage) {
    config.translationConfig = {
      targetLanguageCode: targetLanguage,
      echoTargetLanguage: true,
    }
  }

  return config
}

async function fetchEphemeralToken() {
  const res = await fetch('/api/gemini-live-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || data.details || 'Could not get live session token')
  }
  if (!data.token) throw new Error('No token returned from server')
  return data.token
}

export function useGeminiLive() {
  const sessionRef = useRef(null)
  const playbackRef = useRef(null)
  const micRef = useRef(null)
  const videoStreamRef = useRef(null)
  const videoIntervalRef = useRef(null)
  const videoElRef = useRef(null)
  const optionsRef = useRef({})

  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [inputTranscript, setInputTranscript] = useState('')
  const [outputTranscript, setOutputTranscript] = useState('')
  const [transcriptLog, setTranscriptLog] = useState([])
  const [micOn, setMicOn] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [goAway, setGoAway] = useState(null)

  const appendLog = useCallback((role, text) => {
    const trimmed = String(text || '').trim()
    if (!trimmed) return
    setTranscriptLog((prev) => [...prev.slice(-40), { role, text: trimmed, at: Date.now() }])
  }, [])

  const cleanupMedia = useCallback(async () => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current)
      videoIntervalRef.current = null
    }
    if (micRef.current) {
      await micRef.current.stop()
      micRef.current = null
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop())
      videoStreamRef.current = null
    }
    if (playbackRef.current) {
      playbackRef.current.close()
      playbackRef.current = null
    }
    setMicOn(false)
    setCameraOn(false)
  }, [])

  const handleMessage = useCallback(
    (message) => {
      const content = message.serverContent
      if (!content) {
        if (message.goAway) {
          setGoAway(message.goAway)
        }
        return
      }

      if (content.interrupted) {
        playbackRef.current?.interrupt()
      }

      if (content.inputTranscription?.text) {
        const t = content.inputTranscription.text
        setInputTranscript(t)
        appendLog('user', t)
      }

      if (content.outputTranscription?.text) {
        const t = content.outputTranscription.text
        setOutputTranscript(t)
        appendLog('assistant', t)
      }

      if (content.modelTurn?.parts) {
        for (const part of content.modelTurn.parts) {
          if (part.inlineData?.data) {
            playbackRef.current?.enqueuePcmBase64(part.inlineData.data)
          }
          if (part.text) {
            appendLog('assistant', part.text)
          }
        }
      }
    },
    [appendLog],
  )

  const disconnect = useCallback(async () => {
    await cleanupMedia()
    if (sessionRef.current) {
      try {
        sessionRef.current.close()
      } catch {
        /* ignore */
      }
      sessionRef.current = null
    }
    setStatus('idle')
    setInputTranscript('')
    setOutputTranscript('')
    setGoAway(null)
  }, [cleanupMedia])

  const connect = useCallback(
    async (options = {}) => {
      if (status === 'connecting' || status === 'connected') return

      setStatus('connecting')
      setError('')
      setTranscriptLog([])
      setInputTranscript('')
      setOutputTranscript('')
      setGoAway(null)
      optionsRef.current = options

      try {
        const token = await fetchEphemeralToken()
        const model = options.mode === 'translate' ? MODEL_TRANSLATE : MODEL_CONVERSATION
        const config = buildConfig(options)

        const { GoogleGenAI } = await import('@google/genai')
        const ai = new GoogleGenAI({
          apiKey: token,
          httpOptions: { apiVersion: 'v1alpha' },
        })

        playbackRef.current = new AudioPlaybackQueue()

        const session = await ai.live.connect({
          model,
          config,
          callbacks: {
            onopen: () => setStatus('connected'),
            onmessage: handleMessage,
            onerror: (e) => {
              setError(e?.message || 'Live session error')
              setStatus('error')
            },
            onclose: () => {
              setStatus('idle')
              cleanupMedia()
              sessionRef.current = null
            },
          },
        })

        sessionRef.current = session
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Connection failed')
        setStatus('error')
        await cleanupMedia()
      }
    },
    [status, handleMessage, cleanupMedia],
  )

  const sendText = useCallback((text) => {
    const trimmed = String(text || '').trim()
    if (!trimmed || !sessionRef.current) return
    sessionRef.current.sendRealtimeInput({ text: trimmed })
    appendLog('user', trimmed)
  }, [appendLog])

  const toggleMic = useCallback(async () => {
    if (!sessionRef.current) return

    if (micOn) {
      micRef.current?.setActive(false)
      try {
        sessionRef.current.sendRealtimeInput({ audioStreamEnd: true })
      } catch {
        /* ignore */
      }
      setMicOn(false)
      return
    }

    try {
      if (!micRef.current) {
        micRef.current = new MicCapture((base64) => {
          if (!sessionRef.current) return
          sessionRef.current.sendRealtimeInput({
            audio: { data: base64, mimeType: 'audio/pcm;rate=16000' },
          })
        })
        await micRef.current.start()
      } else {
        micRef.current.setActive(true)
      }
      setMicOn(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone access denied')
    }
  }, [micOn])

  const toggleCamera = useCallback(async () => {
    if (!sessionRef.current) return

    if (cameraOn) {
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current)
        videoIntervalRef.current = null
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => t.stop())
        videoStreamRef.current = null
      }
      setCameraOn(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      videoStreamRef.current = stream
      const video = videoElRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }

      videoIntervalRef.current = setInterval(() => {
        const frame = captureVideoFrame(videoElRef.current)
        if (frame && sessionRef.current) {
          sessionRef.current.sendRealtimeInput({
            video: { data: frame, mimeType: 'image/jpeg' },
          })
        }
      }, 1000)

      setCameraOn(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Camera access denied')
    }
  }, [cameraOn])

  return {
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
    isConnected: status === 'connected',
    isBusy: status === 'connecting',
  }
}
