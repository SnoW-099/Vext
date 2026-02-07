import { useState, useEffect } from 'react'
import './EntryScreen.css'

const EXAMPLES = [
    'A subscription box for artisan coffee lovers',
    'An AI fitness coach for busy professionals',
    'A marketplace for handmade eco-friendly products',
    'A language learning app using music lyrics',
    'A pet services platform connecting owners with walkers'
];

function EntryScreen({ onScan }) {
    const [hypothesis, setHypothesis] = useState('')
    const [isHovered, setIsHovered] = useState(false)
    const [currentExample, setCurrentExample] = useState('')
    const [exampleIndex, setExampleIndex] = useState(0)
    const [charIndex, setCharIndex] = useState(0)
    const [isDeleting, setIsDeleting] = useState(false)

    // Typewriter effect
    useEffect(() => {
        const targetExample = EXAMPLES[exampleIndex];

        const timeout = setTimeout(() => {
            if (!isDeleting) {
                // Typing
                if (charIndex < targetExample.length) {
                    setCurrentExample(targetExample.substring(0, charIndex + 1));
                    setCharIndex(charIndex + 1);
                } else {
                    // Pause before deleting
                    setTimeout(() => setIsDeleting(true), 2000);
                }
            } else {
                // Deleting
                if (charIndex > 0) {
                    setCurrentExample(targetExample.substring(0, charIndex - 1));
                    setCharIndex(charIndex - 1);
                } else {
                    // Move to next example
                    setIsDeleting(false);
                    setExampleIndex((exampleIndex + 1) % EXAMPLES.length);
                }
            }
        }, isDeleting ? 30 : 60);

        return () => clearTimeout(timeout);
    }, [charIndex, isDeleting, exampleIndex]);

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
                    <img src="/logo.png" alt="VEXT" className="logo-image" />
                    <span className="status">
                        <span className="status-dot" />
                        Status: Online
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="entry-main">
                <div className="entry-content">
                    <h1 className="main-title">
                        VEXT<span className="accent">.AI</span>
                    </h1>

                    <p className="subtitle">
                        VALIDACIÓN DE MERCADO Y ARQUITECTURA DE CONVERSIÓN
                    </p>

                    <div className="input-wrapper">
                        <textarea
                            className="hypothesis-input"
                            placeholder="Describe tu idea de negocio (ej: 'Servicio de limpieza de sneakers premium a domicilio')..."
                            value={hypothesis}
                            onChange={(e) => setHypothesis(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />

                        <button
                            className="scan-btn"
                            onClick={handleSubmit}
                            disabled={!hypothesis.trim()}
                        >
                            ANALIZAR
                        </button>

                        <div className="hint-text">
                            <span className="hint-label">PRUEBA:</span>
                            <span className="hint-example">
                                "{currentExample}<span className="typing-cursor">|</span>"
                            </span>
                        </div>
                    </div>
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
