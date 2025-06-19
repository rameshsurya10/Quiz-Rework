import React, { useState, useEffect } from 'react';
import './CreatingQuizLoader.css';

const CreatingQuizLoader = ({ progress, isFadingOut }) => {
    const [displayProgress, setDisplayProgress] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = progress;
        if (start === end) return;

        const duration = 1500; // ms
        const incrementTime = (duration / end) / 2;

        const timer = setInterval(() => {
            start += 1;
            setDisplayProgress(start);
            if (start === end) {
                clearInterval(timer);
                // Ensure the final progress value is displayed
                setTimeout(() => setDisplayProgress(100), 200);
            }
        }, incrementTime);

        return () => clearInterval(timer);
    }, [progress]);

    return (
        <div className={`loader-overlay ${isFadingOut ? 'fade-out' : ''}`}>
            <div className="loader-content">
                <div className="loader-image-container">
                    <img src={process.env.PUBLIC_URL + '/images/loading.png'} alt="Loading..." className="loader-image" />
                    <span className="loader-percentage">{displayProgress}%</span>
                </div>
                <p className="loader-text">Creating your quiz...</p>
            </div>
        </div>
    );
};

export default CreatingQuizLoader;
