import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { persistCache, LocalStorageWrapper } from 'apollo3-cache-persist';

const cache = new InMemoryCache({
    typePolicies: {
        MediaTitle: {
            merge: true,
        },
        MediaCoverImage: {
            merge: true,
        },
        Media: {
            fields: {
                title: {
                    merge: true,
                },
                coverImage: {
                    merge: true,
                }
            }
        }
    }
});

// Initialize persistence
// We wrap this in an async function or just let it initialize in the background
// Ideally, we wait for this before rendering the app, but for now we'll start it here.
const initCache = async () => {
    try {
        await persistCache({
            cache,
            storage: new LocalStorageWrapper(window.localStorage),
            trigger: 'write', // Persist on every write
            maxSize: 1048576 * 5, // 5 MB limit (optional)
        });
        console.log('Apollo Cache persistence initialized');
    } catch (error) {
        console.error('Error initializing cache persistence:', error);
    }
};

export const cacheRestoredPromise = initCache();

const httpLink = new HttpLink({
    uri: 'https://graphql.anilist.co',
});

const authLink = setContext((_, { headers }) => {
    // get the authentication token from local storage if it exists
    const token = localStorage.getItem('anilist_token') || localStorage.getItem('token');

    // return the headers to the context so httpLink can read them
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : "",
        }
    };
});

export const apolloClient = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: cache,
    defaultOptions: {
        watchQuery: {
            fetchPolicy: 'cache-and-network', // Return cache first, then update from network
        },
        query: {
            //   fetchPolicy: 'cache-first', // Default
        }
    }
});
