export const INPUT_SAMPLE_RATE = 16000
export const OUTPUT_SAMPLE_RATE = 24000

export function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2)
  const view = new DataView(buffer)
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function pcm16ToFloat32(arrayBuffer) {
  const view = new DataView(arrayBuffer)
  const float32 = new Float32Array(view.byteLength / 2)
  for (let i = 0; i < float32.length; i++) {
    const int16 = view.getInt16(i * 2, true)
    float32[i] = int16 / (int16 < 0 ? 0x8000 : 0x7fff)
  }
  return float32
}

function resampleTo16k(input, inputRate) {
  if (inputRate === INPUT_SAMPLE_RATE) return input
  const ratio = inputRate / INPUT_SAMPLE_RATE
  const newLength = Math.round(input.length / ratio)
  const result = new Float32Array(newLength)
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio
    const idx = Math.floor(srcIndex)
    const frac = srcIndex - idx
    const a = input[idx] ?? 0
    const b = input[idx + 1] ?? a
    result[i] = a + (b - a) * frac
  }
  return result
}

export class AudioPlaybackQueue {
  constructor(sampleRate = OUTPUT_SAMPLE_RATE) {
    this.sampleRate = sampleRate
    this.ctx = null
    this.nextTime = 0
    this.sources = []
  }

  ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: this.sampleRate })
      this.nextTime = this.ctx.currentTime
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  enqueuePcmBase64(base64) {
    const ctx = this.ensureContext()
    const pcm = base64ToArrayBuffer(base64)
    const floats = pcm16ToFloat32(pcm)
    const buffer = ctx.createBuffer(1, floats.length, this.sampleRate)
    buffer.copyToChannel(floats, 0)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    const start = Math.max(ctx.currentTime, this.nextTime)
    source.start(start)
    this.nextTime = start + buffer.duration
    this.sources.push(source)
    source.onended = () => {
      this.sources = this.sources.filter((s) => s !== source)
    }
  }

  interrupt() {
    for (const s of this.sources) {
      try {
        s.stop()
      } catch {
        /* already stopped */
      }
    }
    this.sources = []
    if (this.ctx) this.nextTime = this.ctx.currentTime
  }

  close() {
    this.interrupt()
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
  }
}

export class MicCapture {
  constructor(onPcmChunk) {
    this.onPcmChunk = onPcmChunk
    this.stream = null
    this.ctx = null
    this.processor = null
    this.source = null
    this.active = false
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    this.ctx = new AudioContext()
    const inputRate = this.ctx.sampleRate
    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1)
    this.processor.onaudioprocess = (e) => {
      if (!this.active) return
      const input = e.inputBuffer.getChannelData(0)
      const resampled = resampleTo16k(input, inputRate)
      const pcm = floatTo16BitPCM(resampled)
      this.onPcmChunk(arrayBufferToBase64(pcm))
    }
    this.source.connect(this.processor)
    this.processor.connect(this.ctx.destination)
    this.active = true
  }

  setActive(active) {
    this.active = active
  }

  async stop() {
    this.active = false
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }
    if (this.source) {
      this.source.disconnect()
      this.source = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    if (this.ctx) {
      await this.ctx.close()
      this.ctx = null
    }
  }
}

export function captureVideoFrame(videoEl, quality = 0.65) {
  if (!videoEl?.videoWidth) return null
  const canvas = document.createElement('canvas')
  const maxW = 512
  const scale = Math.min(1, maxW / videoEl.videoWidth)
  canvas.width = Math.round(videoEl.videoWidth * scale)
  canvas.height = Math.round(videoEl.videoHeight * scale)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return dataUrl.split(',')[1]
}
