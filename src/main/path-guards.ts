import path from 'path'

export function ensureFilePath(filePath: string, extension?: string, appendExtension = false): string {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new Error('Jalur berkas tidak valid.')
  }

  const resolved = path.resolve(filePath)
  if (extension && path.extname(resolved) === '' && appendExtension) {
    return `${resolved}${extension}`
  }
  if (extension && path.extname(resolved).toLowerCase() !== extension.toLowerCase()) {
    throw new Error(`Berkas harus menggunakan ekstensi ${extension}.`)
  }
  return resolved
}

export function ensureWithinRoots(targetPath: string, roots: string[]): string {
  const resolvedTarget = ensureFilePath(targetPath)
  const allowed = roots.some((root) => {
    const resolvedRoot = path.resolve(root)
    const relative = path.relative(resolvedRoot, resolvedTarget)
    return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))
  })

  if (!allowed) {
    throw new Error('Jalur berada di luar folder yang diizinkan.')
  }
  return resolvedTarget
}
