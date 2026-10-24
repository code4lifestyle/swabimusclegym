import { useEffect, useRef, useState } from 'react'
import { fileToJpegBlob, sourceToJpegBlob } from '../lib/image'

async function requestCamera(facing) {
  const video = {
    facingMode: facing,
    width: { ideal: 1280 },
    height: { ideal: 960 },
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: false })
  } catch (error) {
    if (facing !== 'user' && (error.name === 'OverconstrainedError' || error.name === 'NotFoundError')) {
      return navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
    }
    throw error
  }
}

function cameraMessage(error) {
  if (error?.name === 'NotAllowedError') {
    return 'Camera permission was blocked. Allow the camera, or attach a picture instead.'
  }
  if (error?.name === 'NotFoundError') {
    return 'No camera was found. Attach a picture instead.'
  }
  if (error?.name === 'NotReadableError') {
    return 'The camera is already in use. Close the other app, or attach a picture.'
  }
  return 'The camera could not start. Attach a picture instead.'
}

export default function PhotoPicker({ onBlob, disabled, initialUrl = '' }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef = useRef(null)
  const previewRef = useRef('')
  const ownsPreviewRef = useRef(false)
  const aliveRef = useRef(true)
  const [mode, setMode] = useState(initialUrl ? 'preview' : 'empty')
  const [facing, setFacing] = useState('environment')
  const [previewUrl, setPreviewUrl] = useState(initialUrl || '')
  const [streamNonce, setStreamNonce] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  function replacePreview(nextUrl, owned = true) {
    if (ownsPreviewRef.current && previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = nextUrl
    ownsPreviewRef.current = owned && Boolean(nextUrl)
    setPreviewUrl(nextUrl)
  }

  useEffect(() => {
    aliveRef.current = true
    if (initialUrl) {
      previewRef.current = initialUrl
      ownsPreviewRef.current = false
    }
    return () => {
      aliveRef.current = false
      stopStream()
      if (ownsPreviewRef.current && previewRef.current) URL.revokeObjectURL(previewRef.current)
    }
  }, [initialUrl])

  useEffect(() => {
    const video = videoRef.current
    const stream = streamRef.current
    if (mode !== 'camera' || !video || !stream) return undefined
    video.srcObject = stream
    const play = video.play()
    if (play) play.catch(() => {})
    return undefined
  }, [mode, streamNonce])

  async function startCamera(nextFacing) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('The camera needs localhost or https. Attach a picture instead.')
      return
    }

    setError('')
    setBusy(true)
    try {
      const stream = await requestCamera(nextFacing)
      if (!aliveRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      stopStream()
      streamRef.current = stream
      setFacing(nextFacing)
      setMode('camera')
      setStreamNonce((value) => value + 1)
    } catch (cameraError) {
      if (aliveRef.current) setError(cameraMessage(cameraError))
    } finally {
      if (aliveRef.current) setBusy(false)
    }
  }

  function closeCamera() {
    stopStream()
    setError('')
    setMode(previewRef.current ? 'preview' : 'empty')
  }

  async function capture() {
    const video = videoRef.current
    if (!video?.videoWidth) {
      setError('The camera is still starting. Try again in a moment.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const blob = await sourceToJpegBlob(video, video.videoWidth, video.videoHeight)
      replacePreview(URL.createObjectURL(blob))
      stopStream()
      setMode('preview')
      onBlob(blob)
    } catch (captureError) {
      setError(captureError.message)
    } finally {
      setBusy(false)
    }
  }

  async function attachFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setBusy(true)
    setError('')
    try {
      const blob = await fileToJpegBlob(file)
      replacePreview(URL.createObjectURL(blob))
      stopStream()
      setMode('preview')
      onBlob(blob)
    } catch (fileError) {
      setError(fileError.message)
    } finally {
      setBusy(false)
    }
  }

  function removePhoto() {
    stopStream()
    replacePreview('', false)
    setMode('empty')
    setError('')
    onBlob(null)
  }

  return (
    <div className="photo-picker">
      {mode === 'camera' ? (
        <div className="camera-stage">
          <video ref={videoRef} autoPlay playsInline muted />
          <div className="photo-actions">
            <button className="gate-submit" type="button" onClick={capture} disabled={disabled || busy}>
              Capture
            </button>
            <button
              className="gate-link"
              type="button"
              onClick={() => startCamera(facing === 'environment' ? 'user' : 'environment')}
              disabled={disabled || busy}
            >
              Flip
            </button>
            <button className="gate-link" type="button" onClick={closeCamera} disabled={disabled || busy}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'preview' && previewUrl ? (
        <div className="photo-frame">
          <img src={previewUrl} alt="Selected member photo" />
        </div>
      ) : null}

      {mode === 'empty' ? (
        <div className="photo-empty">
          <span>No picture yet</span>
        </div>
      ) : null}

      {mode !== 'camera' ? (
        <div className="photo-actions">
          <button className="gate-link" type="button" onClick={() => startCamera(facing)} disabled={disabled || busy}>
            Use camera
          </button>
          <button
            className="gate-link"
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || busy}
          >
            Attach picture
          </button>
          {mode === 'preview' ? (
            <button className="gate-link" type="button" onClick={removePhoto} disabled={disabled || busy}>
              Remove
            </button>
          ) : null}
        </div>
      ) : null}

      <input
        ref={fileRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={attachFile}
        tabIndex={-1}
      />
      {error ? <p className="gate-alert">{error}</p> : null}
    </div>
  )
}
