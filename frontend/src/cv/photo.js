/** Centre-crop an image file to a square and compress it to a small JPEG data URL (~20-40 KB). */
export function photoToDataUrl(file, size = 360) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('Choose an image file (JPG, PNG or WebP).')); return }
    if (file.size > 12 * 1024 * 1024) { reject(new Error('That image is over 12 MB. Try a smaller one.')); return }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      const sx = (img.naturalWidth - side) / 2
      // Faces sit in the upper part of most portraits: bias the crop upwards.
      const sy = Math.max(0, (img.naturalHeight - side) * 0.3)
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.84))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')) }
    img.src = url
  })
}
