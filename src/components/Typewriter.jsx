import { useState, useEffect } from 'react';

const Typewriter = ({ text, speed = 30, delay = 0, onComplete }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [started, setStarted] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setStarted(true);
        }, delay);
        return () => clearTimeout(timer);
    }, [delay]);

    useEffect(() => {
        if (!started) return;

        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, speed);

            return () => clearTimeout(timeout);
        } else if (!isFinished) {
            setIsFinished(true);
            if (onComplete) onComplete();
        }
    }, [currentIndex, text, speed, started, onComplete, isFinished]);

    // Reset if text changes completely
    useEffect(() => {
        setDisplayedText('');
        setCurrentIndex(0);
        setStarted(false);
        setIsFinished(false);
        // Restart after small delay to avoid glitch
        setTimeout(() => setStarted(true), delay + 50);
    }, [text, delay]);

    return (
        <span className={`typewriter-text ${!isFinished ? 'typing-active' : ''}`}>
            {displayedText}
        </span>
    );
};

export default Typewriter;
