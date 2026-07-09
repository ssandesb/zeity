export function geminiApiKeyFromEnv(env) {
  return env.GEMINI_API || env.GEMINI_API_KEY || ''
}

export async function createGeminiLiveEphemeralToken(apiKey) {
  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString()

  const url = `https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expireTime,
      newSessionExpireTime,
      uses: 1,
    }),
  })

  let data = {}
  try {
    data = await res.json()
  } catch {
    data = {}
  }

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      (typeof data?.error === 'string' ? data.error : null) ||
      `Gemini token API returned ${res.status}`
    throw new Error(msg)
  }

  if (!data.name) {
    throw new Error('Gemini token API returned no token name')
  }

  return {
    token: data.name,
    expireTime,
    newSessionExpireTime,
  }
}
