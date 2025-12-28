/**
 * GraphQL Query to fetch public profile and favorite anime by username.
 * No tokens or keys required for this.
 */
/**
 * GraphQL Query to fetch public profile.
 * No tokens or keys required for this.
 */
const PUBLIC_USER_QUERY = `
query ($name: String) {
  User (name: $name) {
    id
    name
    avatar {
      large
      medium
    }
    bannerImage
  }
}
`;

/**
 * Query to fetch user's anime list by status (e.g., CURRENT).
 */
const USER_MEDIA_LIST_QUERY = `
query ($userId: Int, $status: MediaListStatus) {
  Page {
    mediaList (userId: $userId, status: $status, type: ANIME, sort: UPDATED_TIME_DESC) {
      id
      progress
      media {
        id
        title {
          english
          romaji
        }
        coverImage {
          extraLarge
          large
        }
        episodes
        nextAiringEpisode {
          episode
          timeUntilAiring
        }
      }
    }
  }
}
`;

/**
 * Query to fetch the user's full anime collection with lists.
 */
const USER_ANIME_COLLECTION_QUERY = `
query ($userId: Int) {
  MediaListCollection(userId: $userId, type: ANIME) {
    lists {
      name
      entries {
        id
        status
        score
        progress
        media {
          id
          title {
            english
            romaji
          }
          coverImage {
            extraLarge
            large
            medium
          }
          episodes
          status
          nextAiringEpisode {
            episode
            timeUntilAiring
          }
        }
      }
    }
  }
}
`;

// ... [Trending and Anime Details queries remain unchanged] ...

/**
 * Fetches public user data from AniList by username.
 */
export async function fetchPublicUser(username: string) {
  // ... implementation
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      query: PUBLIC_USER_QUERY,
      variables: { name: username }
    }),
  });

  return response.json();
}

/**
 * Fetches the user's anime list for a specific status.
 */
export async function fetchUserMediaList(userId: number, status: 'CURRENT' | 'PLANNING' | 'COMPLETED' | 'DROPPED' | 'PAUSED' | 'REPEATING') {
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      query: USER_MEDIA_LIST_QUERY,
      variables: { userId, status }
    }),
  });
  return response.json();
}

/**
 * Fetches the user's full anime collection.
 */
export async function fetchUserAnimeCollection(userId: number) {
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      query: USER_ANIME_COLLECTION_QUERY,
      variables: { userId }
    }),
  });
  return response.json();
}

// ... [Rest of file]

/**
 * Fetches public user data and favorites from AniList by username.
 * 
 * @param {string} username The AniList username to fetch
 * @returns {Promise<any>} The public user data
 */

/**
 * Query to fetch currently trending anime.
 */
const TRENDING_ANIME_QUERY = `
query ($page: Int, $perPage: Int) {
  Page (page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
      perPage
    }
    media (sort: TRENDING_DESC, type: ANIME, isAdult: false) {
      id
      title {
        english
        romaji
        native
      }
      coverImage {
        extraLarge
        large
        medium
        color
      }
      bannerImage
      episodes
      status
      format
      averageScore
      seasonYear
      genres
    }
  }
}
`;

/**
 * Query to fetch detailed information for a specific anime.
 */
const ANIME_DETAILS_QUERY = `
query ($id: Int) {
  Media (id: $id, type: ANIME) {
    id
    title {
      english
      romaji
      native
    }
    coverImage {
      extraLarge
      large
      color
    }
    bannerImage
    description(asHtml: false)
    episodes
    status
    format
    averageScore
    meanScore
    seasonYear
    season
    genres
    studios(isMain: true) {
      nodes {
        name
      }
    }
    nextAiringEpisode {
      episode
      timeUntilAiring
    }
    trailer {
      id
      site
      thumbnail
    }
    recommendations(perPage: 5, sort: RATING_DESC) {
      nodes {
        mediaRecommendation {
           id
           title {
             english
             romaji
           }
           coverImage {
             large
             medium
           }
        }
      }
    }
  }
}
`;


/**
 * Helper to get headers with Auth token
 */
function getHeaders() {
  const token = localStorage.getItem('anilist_token') || localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}


/**
 * Fetches trending anime data.
 */
export async function fetchTrendingAnime(page = 1, perPage = 20) {
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      query: TRENDING_ANIME_QUERY,
      variables: { page, perPage }
    }),
  });
  return response.json();
}

/**
 * Fetches specific anime details by ID.
 */
export async function fetchAnimeDetails(id: number) {
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      query: ANIME_DETAILS_QUERY,
      variables: { id }
    }),
  });
  return response.json();
}

/**
 * Query to fetch the authenticated user (Viewer).
 */
const VIEWER_QUERY = `
query {
  Viewer {
    id
    name
    avatar {
      large
      medium
    }
    bannerImage
    options {
      displayAdultContent
    }
    mediaListOptions {
      scoreFormat
    }
  }
}
`;

/**
 * Fetches the authenticated user's profile.
 * Requires a valid token in localStorage.
 */
export async function fetchCurrentUser() {
  const token = localStorage.getItem('anilist_token') || localStorage.getItem('token');
  if (!token) {
    throw new Error('No access token found');
  }

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      query: VIEWER_QUERY
    }),
  });

  return response.json();
}
