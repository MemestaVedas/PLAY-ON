/**
 * Error Boundary Component
 * 
 * Catches React errors in child components and displays a user-friendly
 * fallback UI instead of crashing the entire app.
 */

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '48px 24px',
                        textAlign: 'center',
                        minHeight: '300px',
                        background: 'rgba(244, 0, 53, 0.05)',
                        borderRadius: '16px',
                        border: '1px solid rgba(244, 0, 53, 0.1)',
                        margin: '16px'
                    }}
                >
                    {/* Error Icon */}
                    <div
                        style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'rgba(244, 0, 53, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '20px'
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#f40035"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>

                    <h3
                        style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            color: 'var(--theme-text-main)',
                            marginBottom: '8px'
                        }}
                    >
                        Something went wrong
                    </h3>

                    <p
                        style={{
                            fontSize: '14px',
                            color: 'var(--theme-text-muted)',
                            marginBottom: '24px',
                            maxWidth: '400px'
                        }}
                    >
                        An unexpected error occurred. Try refreshing or click retry below.
                    </p>

                    {/* Error details (collapsed) */}
                    {this.state.error && (
                        <details
                            style={{
                                marginBottom: '20px',
                                fontSize: '12px',
                                color: 'var(--theme-text-muted)',
                                maxWidth: '100%',
                                textAlign: 'left'
                            }}
                        >
                            <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                                Error details
                            </summary>
                            <pre
                                style={{
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    overflow: 'auto',
                                    maxWidth: '500px',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '11px'
                                }}
                            >
                                {this.state.error.message}
                            </pre>
                        </details>
                    )}

                    <button
                        onClick={this.handleRetry}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '10px',
                            background: 'var(--theme-gradient-primary)',
                            border: 'none',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(180, 162, 246, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
