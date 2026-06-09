import { useEffect, useRef, useState } from 'react'

import { ImagePlus, Loader2, Send, Sparkles, X } from 'lucide-react'

import { fetchChatCompletion } from '../utils/groqChat'

import { compactDaysForApi, compactActiveDay } from '../../shared/zeityChatCore.js'

import { runAiActions } from '../utils/aiActionRunner'

import { foods } from '../data'

import { loadCustomFoods } from '../utils/customFoods'

import { getProteinLogState } from '../utils/aiProteinActions'

import { getZeityColumn, updateZeityColumn } from '../lib/zeityDb'



const DEFAULT_MESSAGES = [

  {

    role: 'assistant',

    content:

      'Hi — I can create day types, check off your tasks & schedule, and log protein from what you ate. Try “I did morning meditation” or “I ate 3 eggs today”.',

  },

]



function loadMessages() {

  const saved = getZeityColumn('ai_chat')

  if (Array.isArray(saved) && saved.length) return saved

  return DEFAULT_MESSAGES

}



function readFileAsDataUrl(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader()

    reader.onload = () => resolve(reader.result)

    reader.onerror = reject

    reader.readAsDataURL(file)

  })

}



export default function AiChatDialog({

  onClose,

  onCreateDay,

  onUpdateDay,

  days = [],

  activeDay = null,

}) {

  const [messages, setMessages] = useState(loadMessages)

  const [input, setInput] = useState('')

  const [images, setImages] = useState([])

  const [busy, setBusy] = useState(false)

  const [analyzingImages, setAnalyzingImages] = useState(false)

  const listRef = useRef(null)

  const fileRef = useRef(null)



  useEffect(() => {

    updateZeityColumn('ai_chat', messages)

  }, [messages])



  useEffect(() => {

    const el = listRef.current

    if (!el) return

    el.scrollTop = el.scrollHeight

  }, [messages, busy])



  const attachFiles = async (fileList) => {

    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))

    if (!files.length) return

    const next = await Promise.all(

      files.slice(0, 3).map(async (file) => ({

        name: file.name,

        dataUrl: await readFileAsDataUrl(file),

      })),

    )

    setImages((prev) => [...prev, ...next].slice(0, 3))

  }



  const send = async () => {

    const text = input.trim()

    const hasImages = images.length > 0

    if ((!text && !hasImages) || busy) return



    const userLine = text || 'Transcribe this schedule image and create a day type from it.'

    const userMsg = {

      role: 'user',

      content: `${userLine}${hasImages ? `\n[${images.length} image${images.length > 1 ? 's' : ''} attached]` : ''}`,

    }

    const history = [...messages, userMsg]

    const imagesPayload = images.map((img) => img.dataUrl)



    setInput('')

    setImages([])

    setMessages(history)

    setAnalyzingImages(hasImages)

    setBusy(true)



    try {

      const result = await fetchChatCompletion({

        userMessage: userLine,

        messages: messages.filter((m) => m.role === 'user' || m.role === 'assistant'),

        images: imagesPayload,

        days: compactDaysForApi(days),

        activeDay: compactActiveDay(activeDay),

        foods,

        customFoods: loadCustomFoods(),

        proteinLog: getProteinLogState(),

      })



      const answer = result?.answer || 'No answer returned.'

      const actions =
        Array.isArray(result?.actions) && result.actions.length
          ? result.actions
          : result?.action
            ? [result.action]
            : []



      const { notes } = runAiActions(actions, {

        days,

        activeDay,

        lastUserMessage: userLine,

        onCreateDay,

        onUpdateDay,

      })



      let finalAnswer = answer

      if (notes.length) {

        finalAnswer = `${answer}\n\n${notes.join('\n')}`

      }



      setMessages([...history, { role: 'assistant', content: finalAnswer }])

    } catch (err) {

      const detail = err instanceof Error ? err.message : ''
      setMessages([

        ...history,

        {

          role: 'assistant',

          content: detail
            ? `Could not reach Zeity AI: ${detail}`
            : 'Could not reach Zeity AI. Check your Groq key in Netlify env and try again.',

        },

      ])

    } finally {

      setBusy(false)

      setAnalyzingImages(false)

    }

  }



  const onKeyDown = (e) => {

    if (e.key === 'Enter' && !e.shiftKey) {

      e.preventDefault()

      send()

    }

  }



  return (

    <div className="modal-scrim ai-chat-scrim" onMouseDown={onClose}>

      <div className="modal ai-chat-modal" onMouseDown={(e) => e.stopPropagation()}>

        <header className="modal-head">

          <div className="mh-title">

            <div className="mh-icon ai-chat-icon">

              <Sparkles size={18} strokeWidth={2.2} />

            </div>

            <div>

              <h2>Zeity AI</h2>

              <p>Create days, check off tasks, log protein — from text or photos</p>

            </div>

          </div>

          <button type="button" className="mh-close" onClick={onClose} aria-label="Close">

            <X size={18} />

          </button>

        </header>



        <div className="ai-chat-list" ref={listRef}>

          {messages.map((m, i) => (

            <div key={i} className={`ai-chat-bubble ${m.role}`}>

              {m.content}

            </div>

          ))}

          {busy && (

            <div className="ai-chat-bubble assistant ai-chat-thinking">

              <Loader2 size={16} className="spin" />

              <span>{analyzingImages ? 'Reading your schedule…' : 'Thinking…'}</span>

            </div>

          )}

        </div>



        {images.length > 0 && (

          <div className="ai-chat-previews">

            {images.map((img, i) => (

              <div key={i} className="ai-chat-thumb">

                <img src={img.dataUrl} alt={img.name} />

                <button

                  type="button"

                  className="ai-chat-thumb-remove"

                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}

                  aria-label="Remove image"

                >

                  <X size={12} />

                </button>

              </div>

            ))}

          </div>

        )}



        <footer className="ai-chat-foot">

          <input

            ref={fileRef}

            type="file"

            accept="image/*"

            multiple

            hidden

            onChange={(e) => {

              attachFiles(e.target.files)

              e.target.value = ''

            }}

          />

          <button

            type="button"

            className="icon-btn ai-chat-attach"

            onClick={() => fileRef.current?.click()}

            disabled={busy}

            title="Attach schedule photo"

          >

            <ImagePlus size={18} />

          </button>

          <textarea

            className="ai-chat-input"

            rows={1}

            placeholder="e.g. I completed all my tasks / I ate 3 eggs today…"

            value={input}

            onChange={(e) => setInput(e.target.value)}

            onKeyDown={onKeyDown}

            disabled={busy}

          />

          <button

            type="button"

            className="btn-primary ai-chat-send"

            onClick={send}

            disabled={busy || (!input.trim() && !images.length)}

          >

            {busy ? <Loader2 size={17} className="spin" /> : <Send size={17} />}

          </button>

        </footer>

      </div>

    </div>

  )

}


