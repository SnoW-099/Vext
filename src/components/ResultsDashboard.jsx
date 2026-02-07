import './ResultsDashboard.css'

function ResultsDashboard({ hypothesis, data, onReset }) {
    return (
        <div className="results-dashboard">
            <div className="grid-bg" />

            {/* Header */}
            <header className="results-header">
                <div className="logo-section">
                    <span className="logo mono">VEXT</span>
                    <span className="status">
                        <span className="status-dot success" />
                        Analysis Complete
                    </span>
                </div>
                <button className="reset-btn mono" onClick={onReset}>
                    [ NEW SCAN ]
                </button>
            </header>

            {/* Main 3-Column Layout */}
            <main className="results-main">
                {/* LEFT: The Blueprint (Preview) */}
                <section className="column column-preview">
                    <div className="column-header mono">
                        <span className="column-icon">◇</span>
                        THE BLUEPRINT
                    </div>
                    <div className="preview-container">
                        <div className="phone-frame">
                            <div className="phone-notch" />
                            <div className="phone-screen">
                                <div className="preview-hero">
                                    <h2 className="preview-title">{data?.websitePreview?.title || 'Your Business'}</h2>
                                    <p className="preview-tagline">{data?.websitePreview?.tagline}</p>
                                </div>
                                <div className="preview-image-placeholder">
                                    <span>AI Generated</span>
                                </div>
                                <button className="preview-cta">Get Started</button>
                                <div className="preview-features">
                                    <div className="feature">✓ Fast Delivery</div>
                                    <div className="feature">✓ Premium Quality</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Button - THE MAIN CTA */}
                    <div className="payment-section">
                        <button className="payment-btn">
                            <span className="payment-icon">⚡</span>
                            <span className="payment-text">
                                <span className="payment-label">VEXT LAUNCH</span>
                                <span className="payment-price">9€ one-time</span>
                            </span>
                        </button>
                        <p className="payment-note mono">Website + Domain + Viral Kit</p>
                    </div>
                </section>

                {/* CENTER: The Logic (Analysis) - SIMPLIFIED */}
                <section className="column column-analysis">
                    <div className="column-header mono">
                        <span className="column-icon">◆</span>
                        THE LOGIC
                    </div>

                    <div className="analysis-content">
                        {/* VEXT Grade - Floating, no box */}
                        <div className="grade-section">
                            <div className="grade-label mono">VEXT GRADE</div>
                            <div className="grade-display">
                                <span className="grade-letter">{data?.grade}</span>
                                <span className="grade-percent">{data?.gradePercent}%</span>
                            </div>
                            <div className="grade-bar">
                                <div
                                    className="grade-fill"
                                    style={{ width: `${data?.gradePercent}%` }}
                                />
                            </div>
                        </div>

                        {/* Targeting - Cleaner */}
                        <div className="analysis-block">
                            <div className="block-header mono">
                                <span className="block-icon">⊕</span>
                                TARGETING
                            </div>
                            <p className="block-content">{data?.targeting}</p>
                        </div>

                        {/* Psychology Triggers - Pill tags */}
                        <div className="analysis-block">
                            <div className="block-header mono">
                                <span className="block-icon">◎</span>
                                PSYCHOLOGY
                            </div>
                            <div className="triggers-list">
                                {data?.psychology?.map((trigger, i) => (
                                    <span key={i} className="trigger-tag mono">{trigger}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* RIGHT: The Growth (Viral Kit - Locked) - MINIMAL MYSTERY */}
                <section className="column column-growth locked">
                    <div className="column-header mono">
                        <span className="column-icon">◈</span>
                        THE GROWTH
                    </div>

                    <div className="locked-overlay">
                        <div className="lock-icon">🔒</div>
                        <p className="lock-text mono">VIRAL KIT</p>
                        <p className="lock-desc text-muted">TikTok scripts for your business</p>
                    </div>

                    <div className="growth-preview">
                        <div className="script-card">
                            <div className="script-header mono">SCRIPT 1</div>
                            <p className="script-content">Stop scrolling if...</p>
                        </div>
                        <div className="script-card">
                            <div className="script-header mono">SCRIPT 2</div>
                            <p className="script-content">I just discovered...</p>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="results-footer mono">
                POWERED BY VEXT ENGINE
            </footer>
        </div>
    )
}

export default ResultsDashboard
