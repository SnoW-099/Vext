import { useState, useEffect } from 'react'
import './Workspace.css'
import {
    Radar,
    Brain,
    Target,
    Zap,
    X,
    ChevronRight,
    Eye,
    RotateCcw,
    Save,
    User,
    MessageSquare
} from 'lucide-react'

import { refineHypothesis } from '../services/vextApi'
import { projectService } from '../services/projectService'
import Typewriter from './Typewriter'

function Workspace({ hypothesis, data: initialData, onReset, currentProject }) {
    const [data, setData] = useState(initialData)
    const [activePanel, setActivePanel] = useState(null)
    const [previewExpanded, setPreviewExpanded] = useState(false)
    const [mobilePage, setMobilePage] = useState('report') // 'report' | 'stats' | 'preview'
    const [isChatOpen, setIsChatOpen] = useState(false)
    const [previewDevice, setPreviewDevice] = useState('mobile') // 'mobile' | 'desktop'

    // Chat & Project State
    const [chatInput, setChatInput] = useState('')
    const [chatHistory, setChatHistory] = useState([])
    const [isRefining, setIsRefining] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [projectId, setProjectId] = useState(currentProject?.id || null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    // Update local data when props change (initial load)
    useEffect(() => {
        if (initialData) setData(initialData)
    }, [initialData])

    // Track changes for save indicator
    useEffect(() => {
        if (data !== initialData) setHasUnsavedChanges(true)
    }, [data, initialData])

    const handleSave = async (silent = false) => {
        if (!silent) setIsSaving(true);
        try {
            const projectToSave = {
                ...currentProject, // Keep existing fields like createdAt
                id: projectId,
                hypothesis: hypothesis || data.websitePreview.title,
                grade: data.grade,
                gradePercent: data.gradePercent,
                gradeExplanation: data.gradeExplanation, // Persist explanation
                strategy: data.strategy, // Persist strategy
                websitePreview: data.websitePreview,
                psychology: data.psychologyDetails || data.psychology,
                targeting: data.targeting,
                updatedAt: new Date().toISOString()
            };

            const savedProject = projectService.save(projectToSave);
            setProjectId(savedProject.id);
            setHasUnsavedChanges(false);

            // ONLY add to chat if NOT silent
            if (!silent) {
                setChatHistory(prev => [...prev, {
                    role: 'ai',
                    content: `Project saved successfully at ${new Date().toLocaleTimeString()}.`
                }]);
            }
        } catch (error) {
            console.error('Save failed', error);
        } finally {
            if (!silent) setTimeout(() => setIsSaving(false), 500);
        }
    };

    const togglePanel = (panel) => {
        setActivePanel(activePanel === panel ? null : panel)
    }

    const handleRefine = async () => {
        if (!chatInput.trim() || isRefining) return;

        const userMsg = { role: 'user', content: chatInput };
        const loadingMsg = { role: 'ai', content: '', isLoading: true };

        setChatHistory(prev => [...prev, userMsg, loadingMsg]);
        setChatInput('');
        setIsRefining(true);

        try {
            const context = {
                grade: data?.grade,
                gradePercent: data?.gradePercent,
                title: data?.websitePreview?.title || '',
                tagline: data?.websitePreview?.tagline || '',
                targeting: data?.targeting || '',
                websitePreview: data?.websitePreview
            };

            const refinedData = await refineHypothesis(
                data.websitePreview.html,
                userMsg.content,
                context
            );

            // Update Workspace Data
            const nextData = {
                ...data,
                grade: refinedData.grade,
                gradePercent: refinedData.gradePercent,
                gradeExplanation: refinedData.gradeExplanation || data.gradeExplanation, // Keep or update explanation
                websitePreview: refinedData.websitePreview
            };
            setData(nextData);

            // AUTO-SAVE (Silent)
            // We save directly here to ensure we use the fresh 'nextData'
            // instead of waiting for state update or reusing handleSave (stale state)
            try {
                // Use the new handleSave with silent parameter
                await handleSave(true);
            } catch (err) {
                console.error('Auto-save failed:', err);
            }

            // Replace loading message with success
            setChatHistory(prev => prev.map(msg =>
                msg.isLoading ? { role: 'ai', content: refinedData.chatResponse } : msg
            ));

        } catch (error) {
            console.error(error);
            const errorMsg = error.message?.includes('504')
                ? 'Server is under high load. Retrying usually works...'
                : 'Connection issue. Please try again.';

            setChatHistory(prev => prev.map(msg =>
                msg.isLoading ? { role: 'ai', content: errorMsg } : msg
            ));
        } finally {
            setIsRefining(false);
        }
    };

    return (
        <div className="workspace">
            {/* ============================================
          MOBILE HEADER
          ============================================ */}
            <header className="mobile-header mobile-only">
                <span className="logo-mark mono">VEXT</span>
                <span className="status-badge">
                    <span className="status-dot" />
                    <span className="status-text mono">ONLINE</span>
                </span>
            </header>

            {/* ============================================
          DESKTOP: Left Rail
          ============================================ */}
            <aside className="left-rail desktop-only">
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
                    <button
                        className={`rail-icon ${hasUnsavedChanges ? 'active' : 'subtle'}`}
                        onClick={handleSave}
                        title="Save Project"
                    >
                        {isSaving ? (
                            <div className="spinner-small" style={{ width: 16, height: 16 }} />
                        ) : (
                            <Save size={18} strokeWidth={1.5} />
                        )}
                    </button>
                    <button className="rail-icon subtle" onClick={onReset} title="Exit to Dashboard">
                        <RotateCcw size={16} strokeWidth={1.5} />
                    </button>
                </div>
            </aside>

            {/* ============================================
          DESKTOP: Side Panel
          ============================================ */}
            {activePanel && (
                <div className="side-panel desktop-only">
                    <div className="panel-header">
                        <span className="panel-title mono">
                            {activePanel === 'grade' && 'CALIFICACIÓN VEXT'}
                            {activePanel === 'psychology' && 'PSICOLOGÍA'}
                            {activePanel === 'targeting' && 'AUDIENCIA'}
                            {activePanel === 'growth' && 'KIT DE CRECIMIENTO'}
                        </span>
                        <button className="panel-close" onClick={() => setActivePanel(null)}>
                            <X size={16} strokeWidth={1.5} />
                        </button>
                    </div>

                    <div className="panel-content">
                        {activePanel === 'grade' && (
                            <div className="grade-panel">
                                <div className="grade-hero">
                                    <span className="grade-letter">{data?.grade || '?'}</span>
                                    <span className="grade-percent mono">{data?.gradePercent || 0}%</span>
                                </div>
                                <div className="grade-bar">
                                    <div className="grade-fill" style={{ width: `${data?.gradePercent || 0}%` }} />
                                </div>
                                <p className="grade-desc">{data?.gradeExplanation || "Pendiente de cálculo."}</p>
                            </div>
                        )}

                        {activePanel === 'psychology' && (
                            <div className="psychology-panel">
                                <p className="panel-intro">Disparadores mentales identificados para máxima conversión:</p>
                                <div className="triggers-grid">
                                    {(data?.psychologyDetails || data?.psychology)?.map((item, i) => (
                                        <div key={i} className="trigger-item-detailed">
                                            <div className="trigger-header">
                                                <span className="trigger-dot" />
                                                <span className="trigger-name">{typeof item === 'string' ? item : (item?.trigger || 'Trigger')}</span>
                                            </div>
                                            {item.explanation && (
                                                <p className="trigger-explanation">{item.explanation}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activePanel === 'targeting' && (
                            <div className="targeting-panel">
                                <p className="panel-intro">Perfil de audiencia neural:</p>
                                <div className="audience-card">
                                    <div className="audience-header">
                                        <div className="audience-icon-wrapper">
                                            <Target size={24} className="audience-icon" />
                                        </div>
                                        <div className="audience-meta">
                                            <span className="audience-label mono">TARGET_ID_001</span>
                                            <span className="audience-status">
                                                <span className="status-dot-small" /> MATCHING
                                            </span>
                                        </div>
                                    </div>
                                    <div className="audience-content mono">
                                        <Typewriter text={data?.targeting || 'Analizando segmentos de mercado...'} speed={15} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activePanel === 'growth' && (
                            <div className="growth-panel">
                                <div className="locked-content">
                                    <Zap size={32} strokeWidth={1} className="locked-icon" />
                                    <p className="locked-title mono">Scripts de Crecimiento Propietarios</p>
                                    <p className="locked-desc">Scripts virales para TikTok adaptados a tu negocio</p>
                                    <button className="unlock-btn">
                                        <span>Desbloquear por 9€</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============================================
          DESKTOP: Center Terminal (always visible)
          ============================================ */}
            <main className="center-terminal desktop-only">
                <div className="chat-container">
                    <div className="chat-messages">
                        {/* Initial Analysis Message */}
                        <div className="message ai">
                            <div className="message-header">
                                <span className="message-role">VEXT</span>
                                <span className="message-time">Just now</span>
                            </div>
                            <div className="message-content">
                                <h1 className="report-title">
                                    {data?.websitePreview?.title || data?.hypothesis || 'Sin Título'}
                                </h1>
                                <p className="report-tagline">
                                    {data?.websitePreview?.tagline || 'Análisis generado por VEXT AI'}
                                </p>
                                <div className="report-section">
                                    <span className="section-label mono">Estrategia</span>
                                    <p className="section-text">
                                        {data?.strategy || "Análisis completado. Revisa los paneles laterales para más detalles."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Chat History */}
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`message ${msg.role}`}>
                                <div className="message-header">
                                    <span className="message-role">{msg.role === 'user' ? 'USER' : 'VEXT'}</span>
                                    <span className="message-time">Refinement</span>
                                </div>
                                <div className="message-content">
                                    {msg.role === 'ai' && msg.isLoading ? (
                                        <div className="typing-indicator mono">
                                            Thinking
                                            <span className="jumping-dot">.</span>
                                            <span className="jumping-dot" style={{ animationDelay: '0.2s' }}>.</span>
                                            <span className="jumping-dot" style={{ animationDelay: '0.4s' }}>.</span>
                                        </div>
                                    ) : (
                                        msg.role === 'ai' ? (
                                            <p className="ai-text-content">
                                                <Typewriter text={msg.content} speed={15} />
                                            </p>
                                        ) : (
                                            <p>{msg.content}</p>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="chat-input-container">
                        <input
                            type="text"
                            className="chat-input"
                            placeholder="Refine your strategy (e.g., 'Make it blue', 'Target gen-z')..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e && e.key === 'Enter') {
                                    if (typeof e.preventDefault === 'function') e.preventDefault();
                                    handleRefine();
                                }
                            }}
                            disabled={isRefining}
                        />
                        <button className="chat-send-btn" onClick={handleRefine} disabled={isRefining}>
                            {isRefining ? <div className="spinner-small" /> : <ChevronRight size={20} />}
                        </button>
                    </div>
                </div>
            </main>

            {/* ============================================
          MOBILE: Full-Page Sections (one at a time)
          ============================================ */}

            {/* Page 1: Report */}
            <div className={`mobile-page ${mobilePage === 'report' ? 'active' : ''}`}>
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
                </div>
            </div>

            {/* Page 2: Stats */}
            <div className={`mobile-page ${mobilePage === 'stats' ? 'active' : ''}`}>
                <div className="mobile-stats">
                    <div className="grade-hero-mobile">
                        <span className="grade-letter">{data?.grade}</span>
                        <span className="grade-percent mono">{data?.gradePercent}%</span>
                    </div>
                    <div className="grade-bar">
                        <div className="grade-fill" style={{ width: `${data?.gradePercent}%` }} />
                    </div>

                    <div className="stats-section">
                        <span className="section-label mono">PSYCHOLOGY TRIGGERS</span>
                        <div className="triggers-grid">
                            {data?.psychology?.map((item, i) => {
                                const triggerText = typeof item === 'string' ? item : (item?.trigger || 'Trigger');
                                return (
                                    <div key={i} className="trigger-item">
                                        <span className="trigger-dot" />
                                        <span className="trigger-name">{triggerText}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="stats-section">
                        <span className="section-label mono">TARGET AUDIENCE</span>
                        <p className="target-audience">{data?.targeting}</p>
                    </div>
                </div>
            </div>

            {/* Page 3: Preview */}
            <div className={`mobile-page ${mobilePage === 'preview' ? 'active' : ''}`}>
                <div className="mobile-preview-content" style={{ padding: 0 }}>
                    {data?.websitePreview?.html ? (
                        <iframe
                            srcDoc={data.websitePreview.html}
                            className="preview-iframe"
                            title="Landing Page Preview"
                            sandbox="allow-scripts"
                            style={{
                                width: '100vw',
                                height: 'calc(100vh - 80px)', // adjust for tab bar
                                borderRadius: 0,
                                border: 'none'
                            }}
                        />
                    ) : (
                        <div className="phone-frame-large">
                            <div className="phone-notch" />
                            <div className="phone-screen">
                                <div className="preview-hero">
                                    <h2 className="preview-title">{data?.websitePreview?.title || 'Your Business'}</h2>
                                    <p className="preview-tagline">{data?.websitePreview?.tagline}</p>
                                </div>
                                <div className="preview-image">AI Generated</div>
                                <button className="preview-cta-btn">Get Started</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ============================================
          DESKTOP: Multi-Device Preview
          ============================================ */}
            <div className={`floating-preview desktop-only ${previewExpanded ? 'expanded' : ''}`}>
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
                        <span className="preview-label mono">VIEW DESIGN</span>
                    </button>
                ) : (
                    <div className="preview-expanded">
                        <button className="preview-close" onClick={() => setPreviewExpanded(false)}>
                            <X size={24} strokeWidth={1.5} />
                        </button>

                        <div className="preview-viewport">
                            <iframe
                                srcDoc={data?.websitePreview?.html}
                                className="preview-iframe"
                                title="Landing Page Preview"
                                sandbox="allow-scripts"
                            />
                        </div>

                        <button className="launch-btn">
                            <Zap size={18} />
                            <span>VEXT LAUNCH — 9€</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ============================================
          MOBILE: Bottom Tab Bar
          ============================================ */}
            <nav className="mobile-tab-bar mobile-only">
                <button
                    className={`tab-item ${mobilePage === 'report' ? 'active' : ''}`}
                    onClick={() => setMobilePage('report')}
                >
                    <Brain size={20} strokeWidth={1.5} />
                    <span className="tab-label">Scan</span>
                </button>
                <button
                    className={`tab-item ${mobilePage === 'stats' ? 'active' : ''}`}
                    onClick={() => setMobilePage('stats')}
                >
                    <span className="tab-grade">{data?.grade}</span>
                    <span className="tab-label">{data?.gradePercent}%</span>
                </button>
                <button
                    className={`tab-item ${mobilePage === 'preview' ? 'active' : ''}`}
                    onClick={() => setMobilePage('preview')}
                >
                    <Eye size={20} strokeWidth={1.5} />
                    <span className="tab-label">Preview</span>
                </button>
                <button className="tab-item launch" onClick={() => setPreviewExpanded(true)}>
                    <Zap size={20} strokeWidth={1.5} />
                    <span className="tab-label">Launch</span>
                </button>
            </nav>

            {/* ============================================
           MOBILE: Chat Overlay
           ============================================ */}
            {isChatOpen && (
                <div className="mobile-chat-overlay mobile-only">
                    <div className="chat-header-mobile">
                        <span className="logo-mark mono">VEXT TERMINAL</span>
                        <button className="chat-close-btn" onClick={() => setIsChatOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="chat-messages-mobile">
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`message ${msg.role}`}>
                                <div className="message-header">
                                    <span className="message-role">{msg.role === 'user' ? 'USER' : 'VEXT'}</span>
                                </div>
                                <div className="message-content">
                                    {msg.role === 'ai' && msg.isLoading ? (
                                        <div className="typing-indicator mono">
                                            Thinking
                                            <span className="jumping-dot">.</span>
                                            <span className="jumping-dot" style={{ animationDelay: '0.2s' }}>.</span>
                                            <span className="jumping-dot" style={{ animationDelay: '0.4s' }}>.</span>
                                        </div>
                                    ) : (
                                        <p className="ai-text-content">
                                            {msg.role === 'ai' ? <Typewriter text={msg.content} speed={15} /> : msg.content}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="chat-input-mobile">
                        <input
                            type="text"
                            placeholder="Refine..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                        />
                        <button className="mobile-send-btn" onClick={handleRefine}>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile Chat FAB */}
            {!isChatOpen && !previewExpanded && (
                <button className="chat-fab mobile-only" onClick={() => setIsChatOpen(true)}>
                    <MessageSquare size={24} />
                </button>
            )}

            {/* ============================================
           MOBILE: Launch Modal
           ============================================ */}
            {previewExpanded && (
                <div className="mobile-launch-modal mobile-only">
                    <div className="modal-backdrop" onClick={() => setPreviewExpanded(false)} />
                    <div className="modal-content">
                        <button className="modal-close" onClick={() => setPreviewExpanded(false)}>
                            <X size={20} strokeWidth={1.5} />
                        </button>
                        <Zap size={40} strokeWidth={1} className="modal-icon" />
                        <h3 className="modal-title">VEXT LAUNCH</h3>
                        <p className="modal-desc">Get your ready-to-deploy website, custom domain, and viral TikTok scripts.</p>
                        <button className="modal-cta">
                            <span>Launch for 9€</span>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Workspace
