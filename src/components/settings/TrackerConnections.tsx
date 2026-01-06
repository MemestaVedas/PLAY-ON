/**
 * Tracker Connections Component
 * 
 * Displays connection status for AniList and MAL,
 * with buttons to login/logout for each service.
 */

import React from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { useMalAuth } from '../../context/MalAuthContext';
import './TrackerConnections.css';

export const TrackerConnections: React.FC = () => {
    const anilist = useAuthContext();
    const mal = useMalAuth();

    return (
        <div className="tracker-connections">
            <h3>Connected Trackers</h3>
            <p className="tracker-subtitle">
                Connect your accounts to sync anime and manga progress
            </p>

            <div className="tracker-list">
                {/* AniList Connection */}
                <div className={`tracker-card ${anilist.isAuthenticated ? 'connected' : ''}`}>
                    <div className="tracker-info">
                        <div className="tracker-logo anilist">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                <path d="M6.361 2.943L0 21.056h4.942l1.077-3.133H11.4l1.052 3.133H22.9c.71 0 1.1-.392 1.1-1.101V17.53c0-.71-.39-1.101-1.1-1.101h-6.483V4.045c0-.71-.392-1.102-1.101-1.102h-2.422c-.71 0-1.101.392-1.101 1.102v1.064l-.758-2.166zm6.339 11.213H9.3l1.7-4.98z" />
                            </svg>
                        </div>
                        <div className="tracker-details">
                            <span className="tracker-name">AniList</span>
                            {anilist.isAuthenticated ? (
                                <span className="tracker-user">{anilist.user?.name}</span>
                            ) : (
                                <span className="tracker-status">Not connected</span>
                            )}
                        </div>
                    </div>
                    <div className="tracker-actions">
                        {anilist.loading ? (
                            <span className="tracker-loading">Loading...</span>
                        ) : anilist.isAuthenticated ? (
                            <button
                                className="tracker-btn disconnect"
                                onClick={anilist.logout}
                            >
                                Disconnect
                            </button>
                        ) : (
                            <button
                                className="tracker-btn connect"
                                onClick={anilist.login}
                            >
                                Connect
                            </button>
                        )}
                    </div>
                </div>

                {/* MAL Connection */}
                <div className={`tracker-card ${mal.isAuthenticated ? 'connected' : ''}`}>
                    <div className="tracker-info">
                        <div className="tracker-logo mal">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                <path d="M8.273 7.247v8.423l-2.103-.002v-5.167l-1.386 3.544H3.407l-1.412-3.506v5.129H0v-8.421h2.382l1.882 4.593 1.858-4.593Zm7.756 2.086H13.79v-2.087h6.198v2.087h-2.239v6.336h-1.72Zm6.047 0h-1.72v-2.087h1.72v2.087Zm-1.72 6.336h1.72v-4.249h-1.72Zm-4.344-6.336h-1.72v-2.087h1.72v2.087Zm0 6.336h-1.72v-4.249h1.72Z" />
                            </svg>
                        </div>
                        <div className="tracker-details">
                            <span className="tracker-name">MyAnimeList</span>
                            {mal.isAuthenticated ? (
                                <span className="tracker-user">{mal.user?.name}</span>
                            ) : (
                                <span className="tracker-status">Not connected</span>
                            )}
                        </div>
                    </div>
                    <div className="tracker-actions">
                        {mal.loading ? (
                            <span className="tracker-loading">Loading...</span>
                        ) : mal.isAuthenticated ? (
                            <button
                                className="tracker-btn disconnect"
                                onClick={mal.logout}
                            >
                                Disconnect
                            </button>
                        ) : (
                            <button
                                className="tracker-btn connect"
                                onClick={mal.login}
                            >
                                Connect
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {mal.error && (
                <div className="tracker-error">
                    {mal.error}
                </div>
            )}
        </div>
    );
};

export default TrackerConnections;
