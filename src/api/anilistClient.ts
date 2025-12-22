/**
 * AniList GraphQL Client
 * 
 * This module handles all communication with the AniList GraphQL API.
 * 
 * INTERVIEW EXPLANATION:
 * =====================
 * 
 * What is GraphQL?
 * ----------------
 * GraphQL is a query language for APIs that lets clients request exactly the data they need.
 * Unlike REST APIs where you get fixed responses, GraphQL lets you specify which fields you want.
 * 
 * How does it work?
 * -----------------
 * 1. We send a POST request to the GraphQL endpoint
 * 2. The request body contains:
 *    - query: A string defining what data we want (written in GraphQL syntax)
 *    - variables: Dynamic values to pass into the query (like username)
 * 3. The server responds with JSON containing exactly the fields we requested
 * 
 * Why GraphQL for AniList?
 * ------------------------
 * - AniList only provides a GraphQL API (no REST)
 * - We can fetch user avatar, name, and other data in a single request
 * - We only get the data we need, reducing bandwidth
 * - Strongly typed responses match our TypeScript interfaces
 */

import type { AniListUserResponse } from '../types/anilist.types';

/** AniList's public GraphQL endpoint - no authentication required for public data */
const ANILIST_API_URL = 'https://graphql.anilist.co';

/**
 * GraphQL query to fetch user profile data
 * 
 * INTERVIEW EXPLANATION:
 * This is written in GraphQL Query Language. Let me break it down:
 * 
 * - `query ($name: String)` - Defines a query that accepts a $name variable of type String
 * - `User(name: $name)` - Calls the User query with the name parameter
 * - The fields inside { } are what we want back:
 *   - id: User's unique ID
 *   - name: Display name
 *   - avatar { large medium }: Avatar URLs in two sizes
 *   - siteUrl: Link to their AniList profile
 * 
 * We only request the fields we actually need, which is the power of GraphQL!
 */
const USER_QUERY = `
query ($name: String) {
  User(name: $name) {
    id
    name
    avatar {
      large
      medium
    }
    siteUrl
    bannerImage
  }
}
`;

/**
 * Fetches user data from AniList GraphQL API
 * 
 * INTERVIEW EXPLANATION - The Fetch Process:
 * ==========================================
 * 
 * Step 1: Prepare the Request
 * ---------------------------
 * We use the native fetch() API to make an HTTP POST request.
 * The request body is JSON with two fields:
 * - query: Our GraphQL query string
 * - variables: An object with the username
 * 
 * Step 2: Send the Request
 * ------------------------
 * Headers:
 * - Content-Type: application/json (tells server we're sending JSON)
 * - Accept: application/json (tells server we want JSON back)
 * 
 * Step 3: Handle the Response
 * ---------------------------
 * - Check if response.ok (status 200-299)
 * - Parse JSON response
 * - Validate that we got user data
 * - Return typed data or throw error
 * 
 * Error Handling:
 * ---------------
 * - Network errors: Caught by try/catch
 * - HTTP errors: Checked with response.ok
 * - GraphQL errors: Checked by validating data.User exists
 * - User not found: Specific error message
 * 
 * @param username - AniList username to fetch
 * @returns Promise with user profile data
 * @throws Error if user not found or network fails
 */
export async function fetchAniListUser(username: string): Promise<AniListUserResponse> {
    try {
        // Make POST request to GraphQL endpoint
        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: USER_QUERY,
                variables: {
                    name: username,
                },
            }),
        });

        // Check if request was successful (status 200-299)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse JSON response
        const data: AniListUserResponse = await response.json();

        // Validate that we got user data
        if (!data.data?.User) {
            throw new Error(`User "${username}" not found on AniList`);
        }

        return data;
    } catch (error) {
        // Re-throw with more context
        if (error instanceof Error) {
            throw new Error(`Failed to fetch AniList user: ${error.message}`);
        }
        throw new Error('Failed to fetch AniList user: Unknown error');
    }
}

/**
 * INTERVIEW TALKING POINTS:
 * =========================
 * 
 * 1. Why async/await?
 *    - Makes asynchronous code look synchronous
 *    - Easier to read than .then() chains
 *    - Better error handling with try/catch
 * 
 * 2. Why TypeScript?
 *    - Type safety ensures we handle the response correctly
 *    - IDE autocomplete for response fields
 *    - Catches errors at compile time, not runtime
 * 
 * 3. Error handling strategy:
 *    - Network errors: Caught by try/catch
 *    - HTTP errors: Checked with response.ok
 *    - Invalid data: Validated before returning
 *    - User-friendly error messages
 * 
 * 4. Why not use a GraphQL client library?
 *    - Native fetch is sufficient for simple queries
 *    - No extra dependencies = smaller bundle size
 *    - Full control over request/response handling
 *    - For complex apps, libraries like Apollo Client are better
 */
