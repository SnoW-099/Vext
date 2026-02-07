import { useState } from 'react'
import './EntryScreen.css'

function EntryScreen({ onScan }) {
    const [hypothesis, setHypothesis] = useState('')
    const [isHovered, setIsHovered] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        if (hypothesis.trim()) {
            onScan(hypothesis.trim())
        }
    }

    return (
        <div className="entry-screen">
            {/* Background Grid */}
            <div className="grid-bg" />

            {/* Header */}
            <header className="entry-header">
                <div className="logo-section">
                    <span className="logo">VEXT</span>
                    <span className="status">
                        <span className="status-dot" />
                        Status: Online
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="entry-main">
                <div className="entry-content">
                    <h1 className="tagline">
                        <span className="tagline-line">Describe your business.</span>
                        <span className="tagline-line accent">We build the website.</span>
                    </h1>

                    <form className="input-section" onSubmit={handleSubmit}>
                        <div className="input-wrapper">
                            <textarea
                                className="hypothesis-input mono"
                                placeholder="[ INSERT BUSINESS HYPOTHESIS ]"
                                value={hypothesis}
                                onChange={(e) => setHypothesis(e.target.value)}
                                rows={4}
                            />
                            <div className="input-decoration">
                                <span className="decoration-corner tl" />
                                <span className="decoration-corner tr" />
                                <span className="decoration-corner bl" />
                                <span className="decoration-corner br" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`scan-button ${isHovered ? 'hovered' : ''}`}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            disabled={!hypothesis.trim()}
                        >
                            <span className="scan-text mono">[ SCAN ]</span>
                            <span className="scan-arrow">→</span>
                        </button>
                    </form>

                    <p className="hint mono text-muted">
                        Example: "A subscription box for artisan coffee lovers"
                    </p>
                </div>
            </main>

            {/* Footer */}
            <footer className="entry-footer mono text-muted">
                <span>POWERED BY VEXT ENGINE</span>
            </footer>
        </div>
    )
}

export default EntryScreen
