const APP_NAME = 'SwabiMuscleGym'
const API = 'https://api.audius.co/v1'
const MIN_TRACKS = 200
const PAGE_SIZE = 50

const GYM_QUERIES = [
  'gym workout',
  'workout motivation',
  'fitness training',
  'gym pump',
  'workout beats',
  'lifting music',
  'cardio workout',
  'running motivation',
  'crossfit',
  'bodybuilding',
  'hiit workout',
  'powerlifting',
  'gym hip hop',
  'workout edm',
  'training music',
  'beast mode',
  'workout mix',
  'gym rap',
  'fitness edm',
  'hardstyle gym',
]

function artworkUrl(track) {
  const art = track?.artwork || {}
  return art['150x150'] || art['480x480'] || art['1000x1000'] || ''
}

function mapTrack(track) {
  if (!track?.id || !track?.title) return null
  return {
    id: String(track.id),
    title: track.title,
    artist: track.user?.name || 'Audius',
    duration: Number(track.duration) || 0,
    artwork: artworkUrl(track),
    streamUrl: `${API}/tracks/${track.id}/stream?app_name=${encodeURIComponent(APP_NAME)}`,
  }
}

async function fetchJson(path, params) {
  const search = new URLSearchParams({ ...params, app_name: APP_NAME })
  const response = await fetch(`${API}${path}?${search}`)
  if (!response.ok) throw new Error('Music service is unavailable right now.')
  const payload = await response.json()
  return payload.data || []
}

async function searchGymTracks(query, { offset = 0, limit = PAGE_SIZE, withBpm = true } = {}) {
  const params = {
    query,
    limit: String(limit),
    offset: String(offset),
    sort_method: 'popular',
  }
  if (withBpm) {
    params.bpm_min = '100'
    params.bpm_max = '180'
  }

  try {
    const rows = await fetchJson('/tracks/search', params)
    return rows.map(mapTrack).filter(Boolean)
  } catch {
    return []
  }
}

async function fetchTrending(limit = 100) {
  try {
    const rows = await fetchJson('/tracks/trending', {
      limit: String(limit),
      time: 'month',
    })
    return rows.map(mapTrack).filter(Boolean)
  } catch {
    return []
  }
}

function mergeTracks(playlist, seen, tracks) {
  for (const track of tracks) {
    if (seen.has(track.id)) continue
    seen.add(track.id)
    playlist.push(track)
    if (playlist.length >= MIN_TRACKS) return true
  }
  return false
}

async function collectSearchPages(queries, offsets, withBpm) {
  const pages = await Promise.all(
    queries.flatMap((query) =>
      offsets.map((offset) => searchGymTracks(query, { offset, limit: PAGE_SIZE, withBpm })),
    ),
  )
  return pages.flat()
}

export async function loadGymPlaylist() {
  const seen = new Set()
  const playlist = []

  const waves = [
    () => collectSearchPages(GYM_QUERIES, [0, 50], true),
    () => collectSearchPages(GYM_QUERIES, [100, 150], true),
    () => collectSearchPages(GYM_QUERIES, [0, 50, 100], false),
    () => fetchTrending(100),
  ]

  for (const wave of waves) {
    const tracks = await wave()
    if (mergeTracks(playlist, seen, tracks)) break
  }

  if (playlist.length === 0) {
    throw new Error('Could not load gym tracks. Check the connection and try again.')
  }

  if (playlist.length < MIN_TRACKS) {
    throw new Error(`Only found ${playlist.length} tracks. Need at least ${MIN_TRACKS}.`)
  }

  return playlist.slice(0, MIN_TRACKS)
}

export function formatTrackTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const mins = Math.floor(total / 60)
  const secs = String(total % 60).padStart(2, '0')
  return `${mins}:${secs}`
}
