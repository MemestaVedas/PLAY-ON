import { apolloClient } from '../lib/apollo';
import { gql } from '@apollo/client';
import { addToOfflineQueue, registerMutationProcessor } from '../lib/offlineQueue';

// ============================================================================
// QUERIES
// ============================================================================

const PUBLIC_USER_QUERY = gql`
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

export const USER_MEDIA_LIST_QUERY = gql`
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
        status
        format
        averageScore
        nextAiringEpisode {
          episode
          timeUntilAiring
        }
      }
    }
  }
}
`;

export const USER_ANIME_COLLECTION_QUERY = gql`
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

export const USER_STATS_QUERY = gql`
query ($userId: Int) {
  User (id: $userId) {
    id
    name
    statistics {
      anime {
        count
        meanScore
        standardDeviation
        minutesWatched
        episodesWatched
        statuses {
          count
          status
        }
      }
    }
  }
}
`;

export const TRENDING_ANIME_QUERY = gql`
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

export const SEARCH_ANIME_QUERY = gql`
query ($search: String, $page: Int, $perPage: Int) {
  Page (page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      hasNextPage
    }
    media (search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      title {
        english
        romaji
      }
      coverImage {
        large
        medium
      }
      format
      episodes
      averageScore
      status
    }
  }
}
`;

// ============================================================================
// MANGA QUERIES
// ============================================================================

export const USER_MANGA_COLLECTION_QUERY = gql`
query ($userId: Int) {
  MediaListCollection(userId: $userId, type: MANGA) {
    lists {
      name
      entries {
        id
        status
        score
        progress
        progressVolumes
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
          chapters
          volumes
          status
        }
      }
    }
  }
}
`;

export const SEARCH_MANGA_QUERY = gql`
query ($search: String, $page: Int, $perPage: Int) {
  Page (page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      hasNextPage
    }
    media (search: $search, type: MANGA, sort: SEARCH_MATCH) {
      id
      title {
        english
        romaji
      }
      coverImage {
        large
        medium
      }
      format
      chapters
      volumes
      averageScore
      status
    }
  }
}
`;
const ANIME_DETAILS_QUERY = gql`
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
    mediaListEntry {
      id
      status
      progress
      score(format: POINT_100)
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
           episodes
           averageScore
           format
           status
        }
      }
    }
  }
}
`;

export const USER_ACTIVITY_QUERY = gql`
query ($userId: Int, $page: Int, $perPage: Int) {
  Page (page: $page, perPage: $perPage) {
    activities (userId: $userId, type: MEDIA_LIST, sort: ID_DESC) {
      ... on ListActivity {
        id
        status
        progress
        createdAt
        media {
          id
          title {
            english
            romaji
          }
          coverImage {
            medium
          }
        }
      }
    }
  }
}
`;

const VIEWER_QUERY = gql`
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

// ============================================================================
// MUTATIONS
// ============================================================================

const UPDATE_MEDIA_PROGRESS_MUTATION = gql`
mutation UpdateMediaProgress($mediaId: Int, $progress: Int, $status: MediaListStatus) {
  SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status) {
    id
    progress
    status
    media {
      id
      title {
        english
      }
    }
  }
}
`;

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

/**
 * Fetches public user data from AniList by username.
 */
export async function fetchPublicUser(username: string) {
  const result = await apolloClient.query({
    query: PUBLIC_USER_QUERY,
    variables: { name: username }
  });
  return result; // Wrapper to match previous behavior? Apollo returns { data, loading, error }
  // Previous fetch returned response.json(), which is { data: ... }
  // Apollo result structure is slightly different but result.data is the same.
  // We might need to adjust consumers if they expect exactly 'response.json()' structure including errors array at top level.
  // But usually Apollo result is compatible enough or better.
}

/**
 * Fetches the user's anime list for a specific status.
 */
export async function fetchUserMediaList(userId: number, status: 'CURRENT' | 'PLANNING' | 'COMPLETED' | 'DROPPED' | 'PAUSED' | 'REPEATING') {
  const result = await apolloClient.query({
    query: USER_MEDIA_LIST_QUERY,
    variables: { userId, status }
  });
  return result;
}

/**
 * Fetches the user's full anime collection.
 */
export async function fetchUserAnimeCollection(userId: number) {
  const result = await apolloClient.query({
    query: USER_ANIME_COLLECTION_QUERY,
    variables: { userId }
  });
  return result;
}

/**
 * Fetches trending anime data.
 */
export async function fetchTrendingAnime(page = 1, perPage = 20) {
  const result = await apolloClient.query({
    query: TRENDING_ANIME_QUERY,
    variables: { page, perPage }
  });
  return result;
}

/**
 * Searches anime by title via AniList API.
 */
export async function searchAnime(search: string, page = 1, perPage = 10) {
  const result = await apolloClient.query({
    query: SEARCH_ANIME_QUERY,
    variables: { search, page, perPage },
    fetchPolicy: 'network-only' // Always fetch fresh results for search
  });
  return result;
}

/**
 * Fetches the user's full manga collection.
 */
export async function fetchUserMangaCollection(userId: number) {
  const result = await apolloClient.query({
    query: USER_MANGA_COLLECTION_QUERY,
    variables: { userId }
  });
  return result;
}

/**
 * Searches manga by title via AniList API.
 */
export async function searchManga(search: string, page = 1, perPage = 10) {
  const result = await apolloClient.query({
    query: SEARCH_MANGA_QUERY,
    variables: { search, page, perPage },
    fetchPolicy: 'network-only'
  });
  return result;
}

/**
 * Fetches specific anime details by ID.
 */
export async function fetchAnimeDetails(id: number) {
  const result = await apolloClient.query({
    query: ANIME_DETAILS_QUERY,
    variables: { id }
  });
  return result;
}

/**
 * Fetches the user's activity history.
 */
export async function fetchUserActivity(userId: number, page = 1, perPage = 25) {
  const result = await apolloClient.query({
    query: USER_ACTIVITY_QUERY,
    variables: { userId, page, perPage }
  });
  return result;
}

/**
 * Fetches the authenticated user's profile.
 */
export async function fetchCurrentUser() {
  // Auth is handled by Apollo Link in apollo.ts
  const result = await apolloClient.query({
    query: VIEWER_QUERY,
    // fetchPolicy: 'network-only' // Uncomment if we always want fresh user data on app load
  });
  return result;
}

// Helper for mutation execution (used by both direct call and offline queue)
const executeUpdateMediaProgress = async (variables: any) => {
  return apolloClient.mutate({
    mutation: UPDATE_MEDIA_PROGRESS_MUTATION,
    variables,
    optimisticResponse: {
      SaveMediaListEntry: {
        __typename: "MediaList",
        id: -1,
        progress: variables.progress,
        status: variables.status || "CURRENT",
        media: {
          __typename: "Media",
          id: variables.mediaId,
          title: {
            __typename: "MediaTitle",
            english: "Updating..."
          }
        }
      }
    }
  });
};

// Register for offline queue processing
registerMutationProcessor('UpdateMediaProgress', executeUpdateMediaProgress);

/**
 * Updates anime progress. Supports offline queuing.
 */
export async function updateMediaProgress(mediaId: number, progress: number, status?: string) {
  const variables = { mediaId, progress, status };
  try {
    return await executeUpdateMediaProgress(variables);
  } catch (err) {
    if (!navigator.onLine) {
      console.warn("Offline! Queuing mutation...", err);
      addToOfflineQueue('UpdateMediaProgress', variables);
      // Return fake success for UI
      return {
        data: {
          SaveMediaListEntry: {
            progress,
            status
          }
        }
      };
    }
    throw err;
  }
}

/**
 * Updates manga progress (chapters read). Supports offline queuing.
 * Uses the same SaveMediaListEntry mutation - AniList uses 'progress' for both anime episodes and manga chapters.
 */
export async function updateMangaProgress(mediaId: number, chaptersRead: number, status?: string) {
  const variables = { mediaId, progress: chaptersRead, status };
  try {
    return await executeUpdateMediaProgress(variables);
  } catch (err) {
    if (!navigator.onLine) {
      console.warn("Offline! Queuing manga mutation...", err);
      addToOfflineQueue('UpdateMediaProgress', variables);
      // Return fake success for UI
      return {
        data: {
          SaveMediaListEntry: {
            progress: chaptersRead,
            status
          }
        }
      };
    }
    throw err;
  }
}
