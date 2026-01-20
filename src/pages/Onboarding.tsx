import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Aurora from '../components/ui/Aurora';
import CurvedLoop from '../components/ui/CurvedLoop';
import Stepper, { Step } from '../components/ui/Stepper';
import { LinkIcon } from '../components/ui/Icons';
import { useAuthContext } from '../context/AuthContext';


/**
 * Onboarding Component
 * 
 * The first interaction point for new users.
 * Features a mesmerizing Aurora background and a multi-step setup process.
 */
function Onboarding() {
    const navigate = useNavigate();
    const { login, isAuthenticated, user, loading: authLoading, loginWithCode } = useAuthContext();


    // Local state for username if they skip login or want to set a local name
    const [localName, setLocalName] = useState('');

    // Track if we should auto-advance after login
    const [waitingForLogin, setWaitingForLogin] = useState(false);

    // Manual login state
    const [showManualLogin, setShowManualLogin] = useState(false);
    const [manualCode, setManualCode] = useState('');

    // Auto-advance logic for login
    useEffect(() => {
        if (waitingForLogin && isAuthenticated && user) {
            // We could trigger a step change here if we had access to the stepper controller,
            // but for now the user will see the state update in the current step.
            setWaitingForLogin(false);
        }
    }, [isAuthenticated, user, waitingForLogin]);


    const handleComplete = () => {
        // Save completion status
        localStorage.setItem('onboardingCompleted', 'true');

        // If user set a local name and isn't logged in, save that
        if (localName.trim() && !isAuthenticated) {
            localStorage.setItem('username', localName.trim());
        }

        // Navigate to home
        navigate('/home');
    };

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
            {/* 1. Aurora Background */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
                <Aurora
                    colorStops={["#7B61FF", "#E88AB3", "#5A99C2"]}
                    blend={0.5}
                    amplitude={1.0}
                    speed={0.5}
                />
            </div>

            {/* 2. Content Overlay with Stepper */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                height: '100%',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                gap: '0rem'
            }}>
                {/* Vertical Sidebar Title */}
                <div className="hidden lg:flex h-full pl-28 pr-0 items-center justify-center select-none z-20">
                    <h1
                        className="text-[12rem] font-heavy tracking-normal text-transparent bg-clip-text bg-gradient-to-t from-white/40 to-white/90 leading-none whitespace-nowrap"
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                        PLAY-ON!
                    </h1>
                </div>

                {/* Vertical Rotating Text (Outside Box) */}
                <div className="hidden lg:flex h-full items-center justify-center -ml-40 -mr-12 z-0 pointer-events-none">
                    <div className="transform -rotate-90 scale-[1.2] opacity-40 mix-blend-screen origin-center w-[600px] flex justify-center">
                        <CurvedLoop
                            marqueeText="TRACK ✦ WATCH ✦ DISCOVER ✦ READ ✦ "
                            speed={2}
                            curveAmount={200}
                            direction="right"
                            interactive={false}
                        />
                    </div>
                </div>

                <div className="w-full max-w-2xl px-4 z-20 -ml-48">
                    <Stepper
                        initialStep={1}
                        onFinalStepCompleted={handleComplete}
                        backButtonText="Previous"
                        nextButtonText="Next"
                        stepCircleContainerClassName="bg-gradient-to-br from-white/10 to-black/20 backdrop-blur-2xl border border-white/20 shadow-2xl relative"
                        contentClassName="min-h-[200px] flex flex-col justify-center relative overflow-hidden"
                        footerClassName="border-t border-white/5 relative bg-black/20"
                    >
                        {/* Step 1: Welcome */}
                        <Step>
                            <div className="flex flex-col items-center text-center space-y-6">
                                <p className="text-xl text-gray-300 max-w-lg font-rounded font-bold">
                                    The ultimate anime tracking and streaming experience.
                                    Let's get you set up in just a few steps.
                                </p>
                            </div>
                        </Step>

                        {/* Step 2: Connect AniList */}
                        <Step>
                            <div className="flex flex-col items-center text-center space-y-8">
                                <h2 className="text-3xl md:text-4xl font-display font-extrabold tracking-wide text-white drop-shadow-md uppercase">Connect your <span className="text-[#7B61FF]">Account</span></h2>

                                {isAuthenticated && user ? (
                                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                                        <div className="w-24 h-24 rounded-full border-4 border-[#5CC281] overflow-hidden mb-4 shadow-lg shadow-[#5CC281]/20">
                                            <img src={user.avatar.large} alt={user.name} className="w-full h-full object-cover" />
                                        </div>
                                        <h3 className="text-2xl font-semibold text-white">Welcome back, {user.name}!</h3>
                                        <p className="text-[#5CC281] mt-2">✓ Account connected successfully</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-gray-300 max-w-md">
                                            Log in with AniList to sync your watchlist, track progress, and get personalized recommendations.
                                        </p>
                                        <button
                                            onClick={() => {
                                                setWaitingForLogin(true);
                                                login();
                                            }}
                                            disabled={authLoading}
                                            className="group relative px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all transform hover:scale-105 border border-[#7B61FF]/30 hover:border-[#7B61FF]/60 shadow-lg shadow-[#7B61FF]/10 flex items-center gap-3 overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-[#7B61FF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <LinkIcon className="w-6 h-6 text-[#7B61FF]" />
                                            {authLoading ? 'Connecting...' : 'Login with AniList'}
                                        </button>
                                        <div className="flex flex-col items-center gap-3 w-full max-w-xs transition-all duration-300">
                                            {!showManualLogin ? (
                                                <button
                                                    onClick={() => setShowManualLogin(true)}
                                                    className="text-xs text-white/40 hover:text-white/80 transition-colors underline-offset-2 hover:underline"
                                                >
                                                    Trouble logging in? Enter code manually
                                                </button>
                                            ) : (
                                                <div className="flex flex-col gap-2 w-full animate-in slide-in-from-top-2 fade-in duration-300">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={manualCode}
                                                            onChange={(e) => setManualCode(e.target.value)}
                                                            placeholder="Paste AniList code here..."
                                                            className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#7B61FF]/50 focus:bg-white/15 transition-all"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                if (manualCode.trim()) {
                                                                    loginWithCode(manualCode.trim());
                                                                }
                                                            }}
                                                            disabled={!manualCode.trim()}
                                                            className="px-3 py-2 bg-[#7B61FF] hover:bg-[#6a51e6] disabled:opacity-50 disabled:hover:bg-[#7B61FF] text-white rounded-lg text-sm font-bold transition-colors"
                                                        >
                                                            →
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowManualLogin(false)}
                                                        className="text-[10px] text-white/30 hover:text-white/60"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </Step>

                        {/* Step 4: Completion */}
                        <Step>
                            <div className="flex flex-col items-center text-center space-y-6">
                                <h2 className="text-3xl md:text-4xl font-display font-extrabold tracking-wide text-white drop-shadow-md uppercase">You're All Set!</h2>
                                <div className="text-6xl my-4">🎉</div>
                                <p className="text-gray-300">
                                    Your personal anime hub is ready.
                                </p>

                                {!isAuthenticated && (
                                    <div className="flex flex-col gap-2 mt-4">
                                        <label className="text-sm text-gray-400">How should we call you?</label>
                                        <input
                                            type="text"
                                            value={localName}
                                            onChange={(e) => setLocalName(e.target.value)}
                                            placeholder="Guest User"
                                            className="px-4 py-2 bg-white/10 rounded-full text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors"
                                        />
                                    </div>
                                )}
                            </div>
                        </Step>
                    </Stepper>
                </div>
            </div>
        </div>
    );
}

export default Onboarding;
