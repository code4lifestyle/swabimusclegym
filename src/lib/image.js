const MAX_EDGE = 720
const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_DATA_URL_CHARS = 700_000

function canvasToJpegBlob(source, width, height, quality) {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  context.drawImage(source, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Could not prepare that photo.'))
        else resolve(blob)
      },
      'image/jpeg',
      quality,
    )
  })
}

export async function sourceToJpegBlob(source, width, height) {
  let quality = 0.72
  let blob = await canvasToJpegBlob(source, width, height, quality)

  while (blob.size > 480_000 && quality > 0.42) {
    quality -= 0.1
    blob = await canvasToJpegBlob(source, width, height, quality)
  }

  return blob
}

export async function fileToJpegBlob(file) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Choose a JPG, PNG, or WEBP photo.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('That photo is larger than 8 MB. Choose a smaller one.')
  }

  try {
    const bitmap = await createImageBitmap(file)
    try {
      return await sourceToJpegBlob(bitmap, bitmap.width, bitmap.height)
    } finally {
      bitmap.close()
    }
  } catch {
    throw new Error('Could not read that photo. Use a JPG, PNG, or WEBP file.')
  }
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      if (!result.startsWith('data:image/jpeg;base64,')) {
        reject(new Error('Could not prepare that photo.'))
        return
      }
      if (result.length > MAX_DATA_URL_CHARS) {
        reject(new Error('That photo is too large for free Firebase. Try a closer, clearer shot.'))
        return
      }
      resolve(result)
    }
    reader.onerror = () => reject(new Error('Could not prepare that photo.'))
    reader.readAsDataURL(blob)
  })
}
