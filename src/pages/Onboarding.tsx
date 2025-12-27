import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Aurora from '../components/ui/Aurora';
import CurvedLoop from '../components/ui/CurvedLoop';

/**
 * Onboarding Component
 * 
 * The first interaction point for new users.
 * Features a mesmerizing Aurora background and interactive text.
 */
function Onboarding() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleGetStarted = () => {
        if (!username.trim()) {
            setError('Please enter a username to continue');
            return;
        }

        // Save username and completion status
        localStorage.setItem('username', username.trim());
        localStorage.setItem('onboardingCompleted', 'true');

        // Navigate to home
        navigate('/home');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleGetStarted();
        }
    };

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
            {/* 1. Aurora Background */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
                <Aurora
                    colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
                    blend={0.5}
                    amplitude={1.0}
                    speed={0.5}
                />
            </div>

            {/* 2. Content Overlay */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
            }}>

                {/* Curved Text Animation */}
                <div style={{ marginBottom: '4rem', width: '100%' }}>
                    <CurvedLoop
                        marqueeText="Welcome ✦ To ✦ PLAY-ON!"
                        speed={2}
                        curveAmount={100}
                        direction="right"
                        interactive={true}

                    />
                </div>

                {/* User Input Section */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.5rem',
                    width: '100%',
                    padding: '0 2rem'
                }}>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Enter your AniList username"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                setError('');
                            }}
                            onKeyDown={handleKeyDown}
                            style={{
                                padding: '1rem 2rem',
                                fontSize: '1.25rem',
                                width: '350px',
                                maxWidth: '90vw',
                                borderRadius: '16px',
                                border: '2px solid rgba(255, 255, 255, 0.2)',
                                background: 'rgba(0, 0, 0, 0.4)',
                                color: 'white',
                                outline: 'none',
                                textAlign: 'center',
                                backdropFilter: 'blur(10px)',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                                e.target.style.background = 'rgba(0, 0, 0, 0.6)';
                                e.target.style.transform = 'scale(1.02)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                e.target.style.background = 'rgba(0, 0, 0, 0.4)';
                                e.target.style.transform = 'scale(1)';
                            }}
                        />
                        {error && (
                            <p style={{
                                position: 'absolute',
                                bottom: '-25px',
                                left: 0,
                                width: '100%',
                                textAlign: 'center',
                                color: '#FF94B4',
                                fontSize: '0.85rem',
                                marginTop: '0.5rem'
                            }}>
                                {error}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={handleGetStarted}
                        style={{
                            padding: '0.75rem 3rem',
                            fontSize: '1rem',
                            fontWeight: '600',
                            borderRadius: '30px',
                            border: 'none',
                            background: 'white',
                            color: '#3A29FF',
                            cursor: 'pointer',
                            transition: 'transform 0.2s, boxShadow 0.2s',
                            boxShadow: '0 4px 15px rgba(58, 41, 255, 0.3)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(58, 41, 255, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(58, 41, 255, 0.3)';
                        }}
                    >
                        Continue →
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Onboarding;
