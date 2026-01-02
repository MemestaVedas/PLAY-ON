import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import AnimeList from './pages/AnimeList';
import MangaList from './pages/MangaList';
import MangaBrowse from './pages/MangaBrowse';
import MangaSourceDetails from './pages/MangaSourceDetails';
import MangaReader from './pages/MangaReader';
import History from './pages/History';
import Statistics from './pages/Statistics';
import AnimeDetails from './pages/AnimeDetails';
import CounterDemo from './pages/CounterDemo';
import MainLayout from './layouts/MainLayout';
import { AuthProvider } from './context/AuthContext';
import { LocalMediaProvider } from './context/LocalMediaContext';
import { NowPlayingProvider } from './context/NowPlayingContext';
import { SettingsProvider } from './context/SettingsContext';
import LocalFolder from './pages/LocalFolder';
import Settings from './pages/Settings';
import "./App.css";

/**
 * ====================================================================
 * APP COMPONENT - THE ROUTING BRAIN OF THE APPLICATION
 * ====================================================================
 * 
 * WHAT IS REACT ROUTER?
 * React Router is a library that enables "client-side routing" in React apps.
 * Instead of loading new HTML pages from a server (traditional websites),
 * React Router swaps React components based on the URL - all in the browser!
 * 
 * KEY CONCEPTS:
 * 
 * 1. BrowserRouter - Wraps the entire app, enables routing functionality
 *    Think of it as: "Turn on routing for this app"
 * 
 * 2. Routes - Container for all route definitions
 *    Think of it as: "Here are all the possible pages"
 * 
 * 3. Route - Defines a single route (URL path → Component)
 *    Think of it as: "When URL is X, show component Y"
 * 
 * 4. Navigate - Redirects to a different route
 *    Think of it as: "Go to this page automatically"
 * 
 * ====================================================================
 * HOW THIS WORKS IN TAURI:
 * ====================================================================
 * 
 * Tauri apps have TWO parts:
 * 
 * FRONTEND (What we're building here):
 * - React app running in a WebView (like a mini browser)
 * - React Router works EXACTLY the same as in a web app
 * - All navigation happens in the frontend - no page reloads!
 * 
 * BACKEND (Rust):
 * - Handles system operations, file access, etc.
 * - NOT involved in page navigation
 * - Only called when you use invoke() for backend tasks
 * 
 * So: Navigation = Pure Frontend (React Router)
 *     System stuff = Backend (Rust via Tauri)
 * 
 * ====================================================================
 */

/**
 * ProtectedRoute Component
 * 
 * PURPOSE: Decides whether to show onboarding or skip to home
 * 
 * HOW IT WORKS:
 * 1. Check localStorage for 'onboardingCompleted' flag
 * 2. If flag exists → User has seen onboarding → Go to /home
 * 3. If no flag → First time user → Show onboarding
 * 
 * This is called a "route guard" or "protected route"
 */
import { useSettings } from './context/SettingsContext';

function ProtectedRoute() {
  const [isChecking, setIsChecking] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const { settings } = useSettings();

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem('onboardingCompleted');
    setHasCompletedOnboarding(completed === 'true');
    setIsChecking(false);
  }, []);

  // Show loading while checking (prevents flash of wrong page)
  if (isChecking) {
    return <div>Loading...</div>;
  }

  // If onboarding completed, redirect to configured default page
  if (hasCompletedOnboarding) {
    const targetPath = `/${settings.defaultPage}`;
    return <Navigate to={targetPath} replace />;
  }

  // Otherwise, show onboarding
  return <Onboarding />;
}

/**
 * Main App Component
 * 
 * THE CRUX OF ROUTING:
 * 
 * <BrowserRouter> - Activates routing for the entire app
 * 
 * <Routes> - Container that holds all route definitions
 * 
 * ROUTES EXPLAINED:
 * 
 * <Route path="/" element={<ProtectedRoute />} />
 *   - Root route - checks if onboarding needed
 * 
 * <Route path="/home" element={<Home />} />
 *   - Home page route
 * 
 * <Route path="/anime-list" element={<AnimeList />} />
 *   - Anime list page
 * 
 * <Route path="/anime/:id" element={<AnimeDetails />} />
 *   - DYNAMIC ROUTE with parameter
 *   - :id is a placeholder that can be any value
 *   - Example: /anime/123 → id = "123"
 *   - AnimeDetails component can access this via useParams()
 * 
 * <Route path="/history" element={<History />} />
 *   - Watch history page
 * 
 * <Route path="/statistics" element={<Statistics />} />
 *   - Viewing statistics page
 * 
 * <Route path="/seasons" element={<Seasons />} />
 *   - Seasonal anime page
 * 
 * <Route path="/now-playing" element={<NowPlaying />} />
 *   - Currently playing anime page
 * 
 * HOW NAVIGATION HAPPENS:
 * 1. User clicks nav item in PillNav or button in a page
 * 2. onClick calls navigate('/target-path')
 * 3. React Router sees URL changed
 * 4. React Router finds matching route
 * 5. React Router unmounts old component, mounts new component
 * 6. All happens instantly, no page reload!
 * 
 * IN TAURI:
 * - This all happens in the WebView (frontend)
 * - No communication with Rust backend needed
 * - Tauri window stays open, content inside changes
 */
import { useOfflineSync } from './lib/offlineQueue';

import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './lib/apollo';

function App() {
  useOfflineSync();

  useEffect(() => {
    // DEV: Clear onboarding status to force onboarding every time
    // Remove this line when ready for production!
    // localStorage.removeItem('onboardingCompleted');
    // localStorage.removeItem('username'); // Commented out to persist login for now
  }, []);

  return (
    <ApolloProvider client={apolloClient}>
      <SettingsProvider>
        <AuthProvider>
          <LocalMediaProvider>
            <NowPlayingProvider>
              <BrowserRouter>
                <Routes>
                  {/* Root route - checks if onboarding needed */}
                  <Route path="/" element={<ProtectedRoute />} />

                  {/* Full-screen Manga Reader (outside MainLayout) */}
                  <Route path="/read/:sourceId/:chapterId" element={<MangaReader />} />

                  {/* Main App Layout */}
                  <Route element={<MainLayout />}>
                    <Route path="/home" element={<Home />} />
                    <Route path="/anime-list" element={<AnimeList />} />
                    <Route path="/manga-list" element={<MangaList />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/statistics" element={<Statistics />} />

                    {/* Dynamic route for anime details */}
                    <Route path="/anime/:id" element={<AnimeDetails />} />
                    <Route path="/counter-demo" element={<CounterDemo />} />

                    {/* Settings Route */}
                    <Route path="/settings" element={<Settings />} />

                    {/* Local Folder Route */}
                    <Route path="/local/:folderPath" element={<LocalFolder />} />

                    {/* Manga Source Routes */}
                    <Route path="/manga-browse" element={<MangaBrowse />} />
                    <Route path="/manga/:sourceId/:mangaId" element={<MangaSourceDetails />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </NowPlayingProvider>
          </LocalMediaProvider>
        </AuthProvider>
      </SettingsProvider>
    </ApolloProvider>
  );
}

export default App;
