import { useNavigate } from 'react-router-dom';

/**
 * Onboarding Component
 * 
 * PURPOSE: This page shows ONLY on the first visit to the app.
 * 
 * HOW IT WORKS:
 * 1. User sees this page when they open the app for the first time
 * 2. When they click "Get Started", we:
 *    - Save a flag in localStorage (browser's local storage)
 *    - Navigate them to the home page
 * 3. On subsequent visits, App.tsx checks localStorage and skips this page
 * 
 * KEY CONCEPT - useNavigate():
 * This is React Router's hook for programmatic navigation.
 * Instead of using <a> tags or window.location, we use navigate('/path')
 * This keeps the app as a Single Page Application (SPA) - no page reloads!
 */
function Onboarding() {
    // useNavigate hook gives us a function to navigate programmatically
    // Think of it as: "navigate = the ability to change pages in code"
    const navigate = useNavigate();

    /**
     * handleGetStarted - Called when user clicks the button
     * 
     * CRUX OF NAVIGATION:
     * 1. localStorage.setItem() - Saves data in browser (persists even after closing app)
     * 2. navigate('/home') - Changes the URL to /home WITHOUT reloading the page
     *    - React Router sees the URL change
     *    - It unmounts Onboarding component
     *    - It mounts Home component
     *    - All happens instantly, no server request needed!
     */
    const handleGetStarted = () => {
        // Mark onboarding as completed in browser's localStorage
        // This persists even when the app is closed
        localStorage.setItem('onboardingCompleted', 'true');

        // Navigate to home page - THIS IS THE CRUX!
        // navigate() changes the route without page reload
        navigate('/home');
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #E0BBE4 0%, #D4A5D8 50%, #C7B8EA 100%)', // Pastel lavender/purple
            color: 'white'
        }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: '700' }}>Welcome to PLAY-ON!</h1>
            <p style={{ fontSize: '1.5rem', marginBottom: '2rem', opacity: 0.95 }}>Your anime tracking companion</p>

            {/* 
        NAVIGATION TRIGGER:
        When clicked, handleGetStarted() is called
        This saves to localStorage and navigates to /home
      */}
            <button
                onClick={handleGetStarted}
                style={{
                    padding: '1rem 2rem',
                    fontSize: '1.2rem',
                    background: 'white',
                    color: '#C7B8EA',
                    border: 'none',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'transform 0.2s',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                Get Started
            </button>
        </div>
    );
}

export default Onboarding;
