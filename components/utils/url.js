// Adapted from https://github.com/carbonplan/ncviewjs-backend/blob/27fa99c3f8aeaa7225589153ef9a85735697a9fd/ncviewjs_backend/helpers.py#L9

const s3ToHttps = (url) => {
  const parts = url.replace('s3://', '').split('/')
  const bucket = parts[0]
  const remainder = parts.slice(1).join('/')

  return `https://${bucket}.s3.amazonaws.com/${remainder}`
}

const gsToHttps = (url) => {
  const trimmedPath = url.replace('gs://', '')

  return `https://storage.googleapis.com/${trimmedPath}`
}

export const sanitizeUrl = (url) => {
  // remove trailing slashes
  const sanitized = url.replace(/\/+$/, '')
  const parsed = new URL(sanitized)

  switch (parsed.protocol) {
    case 'https:':
    case 'http:':
      return sanitized
    case 's3:':
      return s3ToHttps(sanitized)
    case 'gs:':
      return gsToHttps(sanitized)
    // case 'az':
    // case 'abfs':
    // case 'abfss':
    //   break
    default:
      throw new Error(
        `Unsupported protocol ${parsed.protocol}. Only https:, gs:, s3: supported.`
      )
  }
}
