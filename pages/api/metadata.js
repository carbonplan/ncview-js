function constructSearch(search = {}) {
  const params = new URLSearchParams()

  Object.keys(search).forEach((key) => {
    const value = search[key]
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry))
    } else {
      params.append(key, value)
    }
  })

  return params.toString()
}
export default async function handler(req, res) {
  let errorStatus
  try {
    const { path } = req.query
    const serverRes = await fetch(`${path}/.zmetadata`)
    if (!serverRes.ok) {
      errorStatus = serverRes.status ?? 400
      throw new Error(`Metadata request failed with "${serverRes.statusText}"`)
    }
    const result = await serverRes.json()
    res.status(200).send(result)
  } catch (e) {
    res.status(errorStatus).send({ error: e.message })
  }
}
