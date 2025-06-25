import React, { useState, useEffect } from 'react';
import './CreatingQuizLoader.css';

const CreatingQuizLoader = ({ progress, isFadingOut }) => {
    const [displayProgress, setDisplayProgress] = useState(0);

    // Smooth progress animation
    useEffect(() => {
        if (progress === displayProgress) return;

        const duration = 300; // Faster animation for better UX
        const steps = Math.abs(progress - displayProgress);
        const stepDuration = Math.max(duration / steps, 50);

        const timer = setInterval(() => {
            setDisplayProgress(prev => {
                if (prev < progress) {
                    const next = Math.min(prev + 1, progress);
                    if (next === progress) clearInterval(timer);
                    return next;
                } else if (prev > progress) {
                    const next = Math.max(prev - 1, progress);
                    if (next === progress) clearInterval(timer);
                    return next;
                } else {
                    clearInterval(timer);
                    return prev;
                }
            });
        }, stepDuration);

        return () => clearInterval(timer);
    }, [progress, displayProgress]);

    // Dynamic status message based on progress
    const getStatusMessage = (progress) => {
        if (progress <= 10) return "Preparing your quiz...";
        if (progress <= 40) return "Uploading files...";
        if (progress <= 70) return "Processing content...";
        if (progress <= 90) return "Generating questions...";
        if (progress < 100) return "Almost done...";
        return "Quiz created successfully!";
    };

    return (
        <div className={`loader-overlay ${isFadingOut ? 'fade-out' : ''}`}>
            <div className="loader-content">
                <div className="loader-image-container">
                    <img src={process.env.PUBLIC_URL + '/images/loading.png'} alt="Loading..." className="loader-image" />
                    <span className="loader-percentage">{displayProgress}%</span>
                </div>
                <div className="progress-bar-container">
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ 
                                width: `${displayProgress}%`,
                                backgroundColor: displayProgress === 100 ? '#4caf50' : '#2196f3'
                            }}
                        ></div>
                    </div>
                </div>
                <p className="loader-text">{getStatusMessage(displayProgress)}</p>
            </div>
        </div>
    );
};

export default CreatingQuizLoader;
