import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Aurora from '../components/ui/Aurora';
import CurvedLoop from '../components/ui/CurvedLoop';
import Stepper, { Step } from '../components/ui/Stepper';
import { useAuthContext } from '../context/AuthContext';
import { useLocalMedia } from '../context/LocalMediaContext';

/**
 * Onboarding Component
 * 
 * The first interaction point for new users.
 * Features a mesmerizing Aurora background and a multi-step setup process.
 */
function Onboarding() {
    const navigate = useNavigate();
    const { login, isAuthenticated, user, loading: authLoading, loginWithCode } = useAuthContext();
    const { addFolder, folders, removeFolder } = useLocalMedia();

    // Local state for username if they skip login or want to set a local name
    const [localName, setLocalName] = useState('');

    // Track if we should auto-advance after login
    const [waitingForLogin, setWaitingForLogin] = useState(false);

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
                    colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
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
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%'
            }}>
                <div className="w-full max-w-4xl px-4">
                    <Stepper
                        initialStep={1}
                        onFinalStepCompleted={handleComplete}
                        backButtonText="Previous"
                        nextButtonText="Next"
                        stepCircleContainerClassName="bg-black/40 backdrop-blur-xl border border-white/10"
                        contentClassName="min-h-[300px] flex flex-col justify-center"
                        footerClassName="border-t border-white/5"
                    >
                        {/* Step 1: Welcome */}
                        <Step>
                            <div className="flex flex-col items-center text-center space-y-6">
                                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                                    Welcome to PLAY-ON!
                                </h1>
                                <p className="text-lg text-gray-300 max-w-lg">
                                    The ultimate anime tracking and streaming experience.
                                    Let's get you set up in just a few steps.
                                </p>
                                <div className="mt-8">
                                    <CurvedLoop
                                        marqueeText="TRACK ✦ WATCH ✦ DISCOVER ✦ "
                                        speed={3}
                                        curveAmount={50}
                                        direction="right"
                                        interactive={false}
                                    />
                                </div>
                            </div>
                        </Step>

                        {/* Step 2: Connect AniList */}
                        <Step>
                            <div className="flex flex-col items-center text-center space-y-8">
                                <h2 className="text-3xl font-bold text-white">Connect Your Account</h2>

                                {isAuthenticated && user ? (
                                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                                        <div className="w-24 h-24 rounded-full border-4 border-green-500 overflow-hidden mb-4 shadow-lg shadow-green-500/20">
                                            <img src={user.avatar.large} alt={user.name} className="w-full h-full object-cover" />
                                        </div>
                                        <h3 className="text-2xl font-semibold text-white">Welcome back, {user.name}!</h3>
                                        <p className="text-green-400 mt-2">✓ Account connected successfully</p>
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
                                            className="px-8 py-3 bg-[#3DB4F2] hover:bg-[#3da5db] text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-blue-500/30 flex items-center gap-2"
                                        >
                                            {authLoading ? 'Connecting...' : 'Login with AniList'}
                                        </button>
                                        <div className="flex flex-col items-center gap-2">
                                            <p className="text-sm text-gray-500">
                                                Don't have an account? You can skip this step, but features will be limited.
                                            </p>
                                            <button
                                                onClick={() => {
                                                    const code = window.prompt("Paste the 'code' from the AniList URL here:");
                                                    if (code) {
                                                        loginWithCode(code);
                                                    }
                                                }}
                                                className="text-xs text-[#3DB4F2] hover:underline opacity-60 hover:opacity-100"
                                            >
                                                Trouble logging in? Paste code manually
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </Step>

                        {/* Step 3: Setup Library */}
                        <Step>
                            <div className="flex flex-col items-center text-center space-y-6">
                                <h2 className="text-3xl font-bold text-white">Setup Your Library</h2>
                                <p className="text-gray-300 max-w-md">
                                    Select a local folder where you keep your anime. We'll scan it and add it to your sidebar.
                                </p>

                                <div className="w-full max-w-md bg-white/5 rounded-xl p-4 min-h-[100px] flex flex-col items-center justify-center border border-white/10">
                                    {folders.length > 0 ? (
                                        <div className="space-y-2 w-full">
                                            {folders.map(folder => (
                                                <div key={folder.path} className="flex items-center gap-2 text-left bg-white/10 p-2 rounded group">
                                                    <span className="text-xl">📁</span>
                                                    <span className="text-sm text-white truncate flex-1">{folder.path}</span>
                                                    <button
                                                        onClick={() => removeFolder(folder.path)}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded p-1 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Remove folder"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-gray-500 italic">No folders selected yet</span>
                                    )}
                                </div>

                                <button
                                    onClick={() => addFolder('anime')}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <span>+</span> Add Folder
                                </button>
                            </div>
                        </Step>

                        {/* Step 4: Completion */}
                        <Step>
                            <div className="flex flex-col items-center text-center space-y-6">
                                <h2 className="text-3xl font-bold text-white">You're All Set!</h2>
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
                                            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center focus:outline-none focus:border-purple-500 transition-colors"
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
