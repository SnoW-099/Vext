import { useState } from 'react'
import './Workspace.css'
import {
    Radar,
    Brain,
    Target,
    Zap,
    X,
    ChevronRight
} from 'lucide-react'

function Workspace({ hypothesis, data, onReset }) {
    const [activePanel, setActivePanel] = useState(null) // 'grade' | 'psychology' | 'targeting' | 'growth'
    const [previewExpanded, setPreviewExpanded] = useState(false)

    const togglePanel = (panel) => {
        setActivePanel(activePanel === panel ? null : panel)
    }

    return (
        <div className="workspace">
            {/* Left Rail - Icon Navigation */}
            <aside className="left-rail">
                <div className="rail-top">
                    <span className="logo-mark mono">V</span>
                </div>

                <nav className="rail-icons">
                    <button
                        className={`rail-icon ${activePanel === 'grade' ? 'active' : ''}`}
                        onClick={() => togglePanel('grade')}
                        title="VEXT Grade"
                    >
                        <Radar size={20} strokeWidth={1.5} />
                    </button>
                    <button
                        className={`rail-icon ${activePanel === 'psychology' ? 'active' : ''}`}
                        onClick={() => togglePanel('psychology')}
                        title="Psychology"
                    >
                        <Brain size={20} strokeWidth={1.5} />
                    </button>
                    <button
                        className={`rail-icon ${activePanel === 'targeting' ? 'active' : ''}`}
                        onClick={() => togglePanel('targeting')}
                        title="Targeting"
                    >
                        <Target size={20} strokeWidth={1.5} />
                    </button>

                    <div className="rail-divider" />

                    <button
                        className={`rail-icon locked ${activePanel === 'growth' ? 'active' : ''}`}
                        onClick={() => togglePanel('growth')}
                        title="Growth Kit"
                    >
                        <Zap size={20} strokeWidth={1.5} />
                    </button>
                </nav>

                <div className="rail-bottom">
                    <button className="rail-icon subtle" onClick={onReset} title="New Scan">
                        <span className="mono" style={{ fontSize: '0.7rem' }}>NEW</span>
                    </button>
                </div>
            </aside>

            {/* Side Panel (Slides in from left) */}
            {activePanel && (
                <div className="side-panel">
                    <div className="panel-header">
                        <span className="panel-title mono">
                            {activePanel === 'grade' && 'VEXT GRADE'}
                            {activePanel === 'psychology' && 'PSYCHOLOGY'}
                            {activePanel === 'targeting' && 'TARGETING'}
                            {activePanel === 'growth' && 'GROWTH KIT'}
                        </span>
                        <button className="panel-close" onClick={() => setActivePanel(null)}>
                            <X size={16} strokeWidth={1.5} />
                        </button>
                    </div>

                    <div className="panel-content">
                        {activePanel === 'grade' && (
                            <div className="grade-panel">
                                <div className="grade-hero">
                                    <span className="grade-letter">{data?.grade}</span>
                                    <span className="grade-percent mono">{data?.gradePercent}%</span>
                                </div>
                                <div className="grade-bar">
                                    <div className="grade-fill" style={{ width: `${data?.gradePercent}%` }} />
                                </div>
                                <p className="grade-desc">High probability of market success based on competitive analysis and audience alignment.</p>
                            </div>
                        )}

                        {activePanel === 'psychology' && (
                            <div className="psychology-panel">
                                <p className="panel-intro">Mental triggers identified for maximum conversion:</p>
                                <div className="triggers-grid">
                                    {data?.psychology?.map((trigger, i) => (
                                        <div key={i} className="trigger-item">
                                            <span className="trigger-dot" />
                                            <span className="trigger-name">{trigger}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activePanel === 'targeting' && (
                            <div className="targeting-panel">
                                <p className="panel-intro">Primary audience profile:</p>
                                <p className="target-audience">{data?.targeting}</p>
                            </div>
                        )}

                        {activePanel === 'growth' && (
                            <div className="growth-panel">
                                <div className="locked-content">
                                    <Zap size={32} strokeWidth={1} className="locked-icon" />
                                    <p className="locked-title mono">Proprietary Growth Scripts</p>
                                    <p className="locked-desc">TikTok-ready viral scripts tailored to your business</p>
                                    <button className="unlock-btn">
                                        <span>Unlock for 9€</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Center - Terminal Report */}
            <main className="center-terminal">
                <div className="terminal-content">
                    <div className="report-header mono">
                        <span className="report-label">ANALYSIS COMPLETE</span>
                        <span className="report-dot" />
                    </div>

                    <div className="report-body">
                        <h1 className="report-title">{data?.websitePreview?.title || hypothesis}</h1>
                        <p className="report-tagline">{data?.websitePreview?.tagline}</p>

                        <div className="report-section">
                            <span className="section-label mono">Strategy Overview</span>
                            <p className="section-text">
                                Your business concept has been analyzed against market trends, competitor positioning,
                                and psychological conversion patterns. The generated landing page implements a
                                high-conversion architecture optimized for your target demographic.
                            </p>
                        </div>

                        <div className="report-section">
                            <span className="section-label mono">Key Metrics</span>
                            <div className="metrics-row">
                                <div className="metric">
                                    <span className="metric-value">{data?.grade}</span>
                                    <span className="metric-label mono">GRADE</span>
                                </div>
                                <div className="metric">
                                    <span className="metric-value">{data?.psychology?.length || 0}</span>
                                    <span className="metric-label mono">TRIGGERS</span>
                                </div>
                                <div className="metric">
                                    <span className="metric-value">1</span>
                                    <span className="metric-label mono">LANDING</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Command hint at bottom */}
                <div className="terminal-hint mono">
                    <span>← Explore panels</span>
                    <span>•</span>
                    <span>Preview →</span>
                </div>
            </main>

            {/* Right - Floating Preview */}
            <div className={`floating-preview ${previewExpanded ? 'expanded' : ''}`}>
                {!previewExpanded ? (
                    <button className="preview-thumb" onClick={() => setPreviewExpanded(true)}>
                        <div className="thumb-frame">
                            <div className="thumb-notch" />
                            <div className="thumb-content">
                                <div className="thumb-title">{data?.websitePreview?.title?.slice(0, 20)}...</div>
                                <div className="thumb-placeholder" />
                                <div className="thumb-cta" />
                            </div>
                        </div>
                        <span className="preview-label mono">PREVIEW</span>
                    </button>
                ) : (
                    <div className="preview-expanded">
                        <button className="preview-close" onClick={() => setPreviewExpanded(false)}>
                            <X size={20} strokeWidth={1.5} />
                        </button>
                        <div className="phone-frame-large">
                            <div className="phone-notch" />
                            <div className="phone-screen">
                                <div className="preview-hero">
                                    <h2 className="preview-title">{data?.websitePreview?.title || 'Your Business'}</h2>
                                    <p className="preview-tagline">{data?.websitePreview?.tagline}</p>
                                </div>
                                <div className="preview-image">AI Generated</div>
                                <button className="preview-cta">Get Started</button>
                                <div className="preview-features">
                                    <span>✓ Fast Delivery</span>
                                    <span>✓ Premium Quality</span>
                                </div>
                            </div>
                        </div>
                        <button className="launch-btn">
                            <Zap size={18} />
                            <span>VEXT LAUNCH — 9€</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Workspace
