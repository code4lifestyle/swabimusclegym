const APP_NAME = 'SwabiMuscleGym'
const API = 'https://api.audius.co/v1'

const GYM_QUERIES = ['gym workout', 'workout motivation', 'fitness training', 'gym pump']

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

async function searchGymTracks(query, limit = 12) {
  const params = new URLSearchParams({
    query,
    app_name: APP_NAME,
    limit: String(limit),
    sort_method: 'popular',
    bpm_min: '110',
    bpm_max: '170',
  })

  const response = await fetch(`${API}/tracks/search?${params}`)
  if (!response.ok) throw new Error('Music service is unavailable right now.')
  const payload = await response.json()
  return (payload.data || []).map(mapTrack).filter(Boolean)
}

export async function loadGymPlaylist() {
  const seen = new Set()
  const playlist = []

  for (const query of GYM_QUERIES) {
    try {
      const tracks = await searchGymTracks(query, 8)
      for (const track of tracks) {
        if (seen.has(track.id)) continue
        seen.add(track.id)
        playlist.push(track)
        if (playlist.length >= 16) return playlist
      }
    } catch {
      // Try the next gym search term.
    }
  }

  if (playlist.length === 0) {
    throw new Error('Could not load gym tracks. Check the connection and try again.')
  }

  return playlist
}

export function formatTrackTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const mins = Math.floor(total / 60)
  const secs = String(total % 60).padStart(2, '0')
  return `${mins}:${secs}`
}
