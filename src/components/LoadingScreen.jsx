import { useState, useEffect } from 'react'
import './LoadingScreen.css'

const PHASES = [
    { text: 'ANALYZING MARKET VIABILITY...', duration: 2000 },
    { text: 'DECONSTRUCTING AUDIENCE PSYCHOLOGY...', duration: 2000 },
    { text: 'ASSEMBLING CONVERSION ARCHITECTURE...', duration: 2000 },
    { text: 'GENERATING VIRTUAL ASSETS...', duration: 2000 },
]

function LoadingScreen({ hypothesis, onComplete }) {
    const [currentPhase, setCurrentPhase] = useState(0)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const totalDuration = PHASES.reduce((sum, p) => sum + p.duration, 0)
        const startTime = Date.now()

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const newProgress = Math.min((elapsed / totalDuration) * 100, 100)
            setProgress(newProgress)

            // Determine current phase
            let accumulated = 0
            for (let i = 0; i < PHASES.length; i++) {
                accumulated += PHASES[i].duration
                if (elapsed < accumulated) {
                    setCurrentPhase(i)
                    break
                }
            }

            if (elapsed >= totalDuration) {
                clearInterval(interval)
                // Haptic feedback for native app feel
                if (navigator.vibrate) {
                    navigator.vibrate([50, 30, 50])
                }
                setTimeout(onComplete, 300)
            }
        }, 50)

        return () => clearInterval(interval)
    }, [onComplete])

    return (
        <div className="loading-screen">
            <div className="grid-bg" />

            <div className="loading-content">
                {/* Logo */}
                <div className="loading-logo">
                    <span className="logo mono">VEXT</span>
                    <span className="processing mono">PROCESSING</span>
                </div>

                {/* Phase Display */}
                <div className="phase-container">
                    <div className="phase-text mono">
                        {PHASES[currentPhase]?.text}
                    </div>

                    {/* Terminal-style cursor */}
                    <span className="cursor">▊</span>
                </div>

                {/* Progress Bar */}
                <div className="progress-container">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="progress-percent mono">{Math.round(progress)}%</span>
                </div>

                {/* Hypothesis Preview */}
                <div className="hypothesis-preview mono">
                    <span className="label text-muted">INPUT:</span>
                    <span className="value">{hypothesis.slice(0, 80)}{hypothesis.length > 80 ? '...' : ''}</span>
                </div>

                {/* Decorative Elements */}
                <div className="scan-lines" />
            </div>

            <footer className="loading-footer mono text-muted">
                <span>POWERED BY VEXT ENGINE</span>
            </footer>
        </div>
    )
}

export default LoadingScreen
