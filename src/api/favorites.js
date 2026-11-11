const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function fetchFavorites(token) {
  const res = await fetch(`${API_URL}/api/favorites/`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch favorites (${res.status})`)
  }
  return res.json()
}

export async function toggleFavoriteApi(slug, token) {
  const res = await fetch(`${API_URL}/api/favorites/toggle/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({ slug }),
  })
  if (!res.ok) {
    throw new Error(`Failed to toggle favorite (${res.status})`)
  }
  return res.json()
}

export async function syncFavoritesApi(slugs, token) {
  const res = await fetch(`${API_URL}/api/favorites/sync/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({ slugs }),
  })
  if (!res.ok) {
    throw new Error(`Failed to sync favorites (${res.status})`)
  }
  return res.json()
}
