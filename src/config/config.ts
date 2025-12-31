/**
 * Application Configuration
 * 
 * Centralized configuration for the application.
 * This makes it easy to change settings without modifying code.
 */

export const config = {
    /**
     * AniList username to fetch profile data for
     * CHANGE THIS to your AniList username!
     * Example: 'YourUsername'
     */
    anilist: {
        username: 'MemestaVedas',
    },

    /**
     * OAuth Configuration for AniList Authentication
     * 
     * To use OAuth (recommended for production):
     * 1. Go to https://anilist.co/settings/developer
     * 2. Create a new client
     * 3. Set redirect URI to: http://localhost:1420/auth/callback
     * 4. Copy the Client ID and paste below
     * 
     * For development/testing, you can use a Personal Access Token instead:
     * 1. Go to https://anilist.co/settings/developer
     * 2. Generate a Personal Access Token
     * 3. Paste it in the personalAccessToken field below
     */
    oauth: {
        clientId: '33523',
        redirectUri: 'http://localhost:1420/auth/callback',
        authUrl: 'https://anilist.co/api/v2/oauth/authorize',
        tokenUrl: 'https://anilist.co/api/v2/oauth/token',
    },

    /**
     * Personal Access Token (Alternative to OAuth)
     * Use this for quick testing without OAuth setup
     * Generate at: https://anilist.co/settings/developer
     */
    auth: {
        personalAccessToken: 'spCWPTMapryGIQwRZ3djJGSKtzCMXB8udNRyDwxX',
    },
} as const;

/**
 * INTERVIEW EXPLANATION:
 * =====================
 * 
 * Why use a config file?
 * ----------------------
 * 1. Separation of concerns: Configuration separate from logic
 * 2. Easy to modify: Change username without touching component code
 * 3. Single source of truth: One place to update settings
 * 4. Type safety: TypeScript ensures config is used correctly
 * 5. Scalability: Easy to add more config options later
 * 
 * The 'as const' assertion:
 * -------------------------
 * - Makes the object deeply readonly
 * - Prevents accidental modifications
 * - Provides literal types instead of general types
 * - Example: username is type 'YOUR_ANILIST_USERNAME' not just 'string'
 * 
 * In production, you might use:
 * -----------------------------
 * - Environment variables (.env files)
 * - Runtime configuration from a server
 * - User settings stored in localStorage
 * - Configuration management systems
 */
