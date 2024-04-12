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
  try {
    const { path } = req.query
    const serverRes = await fetch(`${path}/.zmetadata`)
    if (!serverRes.ok) {
      throw new Error(
        `Metadata request failed: ${serverRes.status} ${serverRes.statusText}`
      )
    }
    const result = await serverRes.json()
    res.status(200).send(result)
  } catch (e) {
    res.status(400).send({ error: e.message })
  }
}
