import React, { useState, useEffect, useRef } from 'react';
import './CreatingQuizLoader.css';

const CreatingQuizLoader = ({ progress, isFadingOut }) => {
    const [displayProgress, setDisplayProgress] = useState(0);
    const progressRef = useRef(progress);
    const animationFrameRef = useRef();

    useEffect(() => {
        progressRef.current = progress;
    }, [progress]);

    useEffect(() => {
        const animate = () => {
            setDisplayProgress(currentDisplayProgress => {
                const targetProgress = progressRef.current;
                if (currentDisplayProgress < targetProgress) {
                    const diff = targetProgress - currentDisplayProgress;
                    const step = Math.max(0.1, diff * 0.05); // Slower, smoother step
                    const nextProgress = Math.min(currentDisplayProgress + step, targetProgress);
                    
                    if (nextProgress < targetProgress) {
                        animationFrameRef.current = requestAnimationFrame(animate);
                    }
                    return nextProgress;
                }
                return currentDisplayProgress;
            });
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameRef.current);
        };
    }, []);

    // Dynamic status message based on progress
    const getStatusMessage = (p) => {
        if (p <= 10) return "Preparing your quiz...";
        if (p <= 40) return "Uploading files...";
        if (p <= 70) return "Processing content...";
        if (p <= 90) return "Generating questions...";
        if (p < 100) return "Finalizing and wrapping up...";
        return "Quiz created successfully!";
    };

    const statusMessage = getStatusMessage(displayProgress);

    return (
        <div className={`loader-overlay ${isFadingOut ? 'fade-out' : ''}`}>
            <div className="loader-content">
                <div className="loader-image-container">
                    <img src={`${process.env.PUBLIC_URL}/images/loading.png`} alt="Loading..." className="loader-image" />
                </div>
                <div className="loader-percentage-container">
                    <span className="loader-percentage">{Math.round(displayProgress)}%</span>
                </div>
                <div className="progress-bar-container">
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${displayProgress}%` }}
                        >
                            {/* Adding an indeterminate animation for better visual feedback */}
                            {displayProgress > 0 && displayProgress < 100 && <div className="progress-indeterminate"></div>}
                        </div>
                    </div>
                </div>
                <p className="loader-text">{statusMessage}</p>
            </div>
        </div>
    );
};

export default CreatingQuizLoader;
