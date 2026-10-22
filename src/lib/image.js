const MAX_EDGE = 1280
const MAX_FILE_BYTES = 8 * 1024 * 1024

export function sourceToJpegBlob(source, width, height) {
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
      0.86,
    )
  })
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
