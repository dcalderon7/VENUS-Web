const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const DEFAULT_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyNzQ4OWY3ZDY3MzNhYThjMTkwNjY2NDQ5MDUyODQxOCIsIm5iZiI6MTc5NDA2ODMyNy40OTQwMDAyLCJzdWIiOiI2YWVmNGY2N2E2MzJlNGMxZWYxNGYyMDYiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.kXx17z3478eEkuIpAqfOw6QJEKlyS_sXKd6qD8J8Bsc'

const tmdbToken = import.meta.env.VITE_TMDB_ACCESS_TOKEN || DEFAULT_TOKEN

export const TMDB_GENRES = [
  { id: 28, name: 'Acción' },
  { id: 12, name: 'Aventura' },
  { id: 16, name: 'Animación' },
  { id: 35, name: 'Comedia' },
  { id: 80, name: 'Crimen' },
  { id: 99, name: 'Documental' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Familia' },
  { id: 14, name: 'Fantasía' },
  { id: 36, name: 'Historia' },
  { id: 27, name: 'Terror' },
  { id: 10402, name: 'Música' },
  { id: 9648, name: 'Misterio' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Ciencia Ficción' },
  { id: 10770, name: 'Película de TV' },
  { id: 53, name: 'Suspense' },
  { id: 10752, name: 'Bélica' },
  { id: 37, name: 'Oeste' }
]

export function getTmdbImageUrl(path, size = 'w500') {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `https://image.tmdb.org/t/p/${size}${path}`
}

async function tmdbFetch(endpoint) {
  try {
    const url = `${TMDB_BASE_URL}/${endpoint.replace(/^\//, '')}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tmdbToken}`,
        'Content-Type': 'application/json;charset=utf-8'
      }
    })
    if (!response.ok) {
      throw new Error(`TMDB responded with status ${response.status}`)
    }
    return await response.json()
  } catch (err) {
    console.warn('[TMDB Service Warning]', err.message)
    return null
  }
}

// Robust fallback catalog if network fails
const FALLBACK_MOVIES = [
  {
    id: 155,
    title: 'El Caballero de la Noche',
    overview: 'Batman eleva su lucha contra el crimen con la ayuda del teniente Jim Gordon y el fiscal de distrito Harvey Dent.',
    poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdrop_path: '/nMK2819TyqLnStRivGD29RyPJp0.jpg',
    release_date: '2008-07-16',
    vote_average: 8.5,
    genre_ids: [28, 80, 18],
    media_type: 'movie'
  },
  {
    id: 27205,
    title: 'Inception (El Origen)',
    overview: 'Un ladrón que roba secretos corporativos a través del uso de la tecnología de intercambio de sueños recibe la tarea de plantar una idea en la mente de un CEO.',
    poster_path: '/ljsZTbVsrQSqovxLio2mNee6xMk.jpg',
    backdrop_path: '/8ZTVqvKDQ8emSGUEMjsS4yHAuKQ.jpg',
    release_date: '2010-07-15',
    vote_average: 8.4,
    genre_ids: [28, 878, 12],
    media_type: 'movie'
  },
  {
    id: 157336,
    title: 'Interstellar',
    overview: 'Un equipo de exploradores viaja a través de un agujero de gusano en el espacio en un intento por garantizar la supervivencia de la humanidad.',
    poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop_path: '/xJHokMbljvjADYdit5fKSuV0Xv.jpg',
    release_date: '2014-11-05',
    vote_average: 8.4,
    genre_ids: [12, 18, 878],
    media_type: 'movie'
  },
  {
    id: 299536,
    title: 'Avengers: Infinity War',
    overview: 'Los Vengadores y sus aliados deben estar dispuestos a sacrificarlo todo para derrotar al poderoso Thanos.',
    poster_path: '/7WsyChLLEzcqIFv2VOB2yR8RStF.jpg',
    backdrop_path: '/bOGkgRGdhrBYJSLpAYcqivLBYml.jpg',
    release_date: '2018-04-25',
    vote_average: 8.3,
    genre_ids: [28, 12, 878],
    media_type: 'movie'
  },
  {
    id: 550,
    title: 'El Club de la Pelea',
    overview: 'Un oficinista insomnio y un fabricante de jabón despreocupado forman un club de lucha subterráneo que evoluciona hacia algo mucho más grande.',
    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    backdrop_path: '/hZkgoQYus5vegHoetDiLmJhjYee.jpg',
    release_date: '1999-10-15',
    vote_average: 8.4,
    genre_ids: [18],
    media_type: 'movie'
  },
  {
    id: 680,
    title: 'Pulp Fiction',
    overview: 'Las vidas de dos matones a sueldo, la esposa de un gángster y un boxeador se entrelazan en cuatro historias de violencia y redención.',
    poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    backdrop_path: '/suA2Z9vPq2z9Z3J6V8P33h679.jpg',
    release_date: '1994-09-10',
    vote_average: 8.5,
    genre_ids: [53, 80],
    media_type: 'movie'
  }
]

export async function fetchPopularMovies(page = 1) {
  const data = await tmdbFetch(`movie/popular?language=es-MX&page=${page}`)
  if (data && data.results) return data.results
  return FALLBACK_MOVIES
}

export async function fetchTrendingMovies() {
  const data = await tmdbFetch(`trending/movie/day?language=es-MX`)
  if (data && data.results) return data.results
  return FALLBACK_MOVIES
}

export async function fetchTopRatedMovies(page = 1) {
  const data = await tmdbFetch(`movie/top_rated?language=es-MX&page=${page}`)
  if (data && data.results) return data.results
  return FALLBACK_MOVIES
}

export async function fetchUpcomingMovies(page = 1) {
  const data = await tmdbFetch(`movie/upcoming?language=es-MX&page=${page}`)
  if (data && data.results) return data.results
  return FALLBACK_MOVIES
}

export async function searchTmdbMovies(query, page = 1) {
  if (!query || !query.trim()) return []
  const data = await tmdbFetch(`search/movie?query=${encodeURIComponent(query.trim())}&language=es-MX&page=${page}`)
  if (data && data.results) return data.results
  return FALLBACK_MOVIES.filter(m => m.title.toLowerCase().includes(query.toLowerCase()))
}

export async function fetchMovieDetails(tmdbId) {
  if (!tmdbId) return null
  const data = await tmdbFetch(`movie/${tmdbId}?language=es-MX&append_to_response=credits`)
  if (data) return data
  return FALLBACK_MOVIES.find(m => String(m.id) === String(tmdbId)) || null
}
