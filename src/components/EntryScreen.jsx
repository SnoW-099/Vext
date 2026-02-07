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
                        Example: "{currentExample}<span className="typing-cursor">|</span>"
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
