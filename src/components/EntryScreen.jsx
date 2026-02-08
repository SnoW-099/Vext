import { useState, useEffect } from 'react'
import './EntryScreen.css'

const EXAMPLES = [
    'Una caja de suscripción para amantes del café artesanal',
    'Un entrenador de fitness con IA para profesionales ocupados',
    'Un marketplace de productos ecológicos hechos a mano',
    'Una app para aprender idiomas con letras de canciones',
    'Una plataforma que conecta dueños de mascotas con paseadores'
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
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        if (hypothesis.trim()) {
            onScan(hypothesis.trim());
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
                    <h1 className="main-title animate-fade-in">
                        VEXT
                    </h1>

                    <p className="subtitle animate-slide-up delay-100">
                        Escribe una idea de negocio
                    </p>

                    <div className="input-wrapper animate-slide-up delay-200">
                        <textarea
                            className="hypothesis-input"
                            placeholder="Ej: 'Servicio de limpieza de sneakers premium a domicilio'..."
                            value={hypothesis}
                            onChange={(e) => setHypothesis(e.target.value)}
                            onKeyDown={(e) => {
                                if (e && e.key === 'Enter' && !e.shiftKey) {
                                    if (typeof e.preventDefault === 'function') e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />
                    </div>

                    <button
                        className="scan-btn animate-scale-in delay-300"
                        onClick={handleSubmit}
                        disabled={!hypothesis.trim()}
                    >
                        ANALIZAR
                    </button>

                    <div className="hint-text animate-fade-in delay-500">
                        <span className="hint-example">
                            "{currentExample}<span className="typing-cursor">|</span>"
                        </span>
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
