import { useEffect, useRef, useState } from 'react'
import { formatTrackTime, loadGymPlaylist } from '../lib/gymMusic'

export default function GymMusicPlayer() {
  const audioRef = useRef(null)
  const [tracks, setTracks] = useState([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [open, setOpen] = useState(true)

  const track = tracks[index] || null

  useEffect(() => {
    let alive = true
    loadGymPlaylist()
      .then((playlist) => {
        if (!alive) return
        setTracks(playlist)
        setStatus('ready')
      })
      .catch((loadError) => {
        if (!alive) return
        setError(loadError.message || 'Could not load gym music.')
        setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !track) return undefined

    let cancelled = false
    audio.src = track.streamUrl
    audio.load()
    setProgress(0)
    setDuration(track.duration || 0)

    if (playing) {
      const play = audio.play()
      if (play) {
        play.catch(() => {
          if (!cancelled) setPlaying(false)
        })
      }
    }

    return () => {
      cancelled = true
    }
  }, [track?.id])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !track) return undefined
    if (playing) {
      const play = audio.play()
      if (play) play.catch(() => setPlaying(false))
    } else if (!audio.paused) {
      audio.pause()
    }
    return undefined
  }, [playing, track?.id])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return undefined

    function onTime() {
      setProgress(audio.currentTime || 0)
      if (audio.duration && Number.isFinite(audio.duration)) setDuration(audio.duration)
    }
    function onEnded() {
      setIndex((current) => (tracks.length ? (current + 1) % tracks.length : 0))
      setPlaying(true)
    }
    function onPlay() {
      setPlaying(true)
    }
    function onPause() {
      setPlaying(false)
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [tracks.length])

  function skip(step) {
    if (tracks.length === 0) return
    setIndex((current) => (current + step + tracks.length) % tracks.length)
    setPlaying(true)
  }

  async function togglePlay() {
    const audio = audioRef.current
    if (!audio || !track) return

    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    try {
      await audio.play()
      setPlaying(true)
      setError('')
    } catch {
      setError('Tap play again to start gym audio.')
      setPlaying(false)
    }
  }

  function seek(event) {
    const audio = audioRef.current
    if (!audio || !duration) return
    const next = Number(event.target.value)
    audio.currentTime = next
    setProgress(next)
  }

  return (
    <div className={`gym-player ${open ? 'is-open' : ''}`}>
      <audio ref={audioRef} preload="none" />

      <button
        className="gym-player-toggle"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="gym-player-panel"
      >
        <span className={`gym-player-eq ${playing ? 'is-live' : ''}`} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>Gym music</span>
      </button>

      <div id="gym-player-panel" className="gym-player-panel" hidden={!open}>
        <div className="gym-player-head">
          <p className="gate-kicker">Audius · Gym cuts</p>
          <p className="gate-note">Workout tracks only. Free stream.</p>
        </div>

        {status === 'loading' ? <p className="gate-note">Loading gym playlist…</p> : null}
        {status === 'error' ? <p className="gate-alert">{error}</p> : null}

        {status === 'ready' && track ? (
          <>
            <div className="gym-player-now">
              {track.artwork ? (
                <img src={track.artwork} alt="" className="gym-player-art" />
              ) : (
                <div className="gym-player-art gym-player-art-fallback">SM</div>
              )}
              <div className="gym-player-meta">
                <strong>{track.title}</strong>
                <span>{track.artist}</span>
              </div>
            </div>

            <input
              className="gym-player-seek"
              type="range"
              min="0"
              max={Math.max(duration, 1)}
              step="1"
              value={Math.min(progress, duration || 0)}
              onChange={seek}
              aria-label="Seek"
            />
            <div className="gym-player-times">
              <span>{formatTrackTime(progress)}</span>
              <span>{formatTrackTime(duration)}</span>
            </div>

            <div className="gym-player-controls">
              <button className="gate-link" type="button" onClick={() => skip(-1)}>
                Prev
              </button>
              <button className="action-btn action-btn-edit gym-player-play" type="button" onClick={togglePlay}>
                {playing ? 'Pause' : 'Play'}
              </button>
              <button className="gate-link" type="button" onClick={() => skip(1)}>
                Next
              </button>
            </div>

            <div className="gym-player-list" role="list">
              {tracks.map((item, itemIndex) => (
                <button
                  key={item.id}
                  className={`gym-player-track ${itemIndex === index ? 'is-active' : ''}`}
                  type="button"
                  role="listitem"
                  onClick={() => {
                    setIndex(itemIndex)
                    setPlaying(true)
                  }}
                >
                  <span>{item.title}</span>
                  <em>{item.artist}</em>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {error && status === 'ready' ? <p className="gate-alert">{error}</p> : null}
      </div>
    </div>
  )
}
