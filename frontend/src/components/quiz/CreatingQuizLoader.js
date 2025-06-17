import React, { useState, useEffect } from 'react';
import './CreatingQuizLoader.css';

const CreatingQuizLoader = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prevProgress => {
        if (prevProgress >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prevProgress + 1;
      });
    }, 40); // Control the speed of the counter

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="loader-overlay">
      <div className="loader-content">
        <img src="/images/loading.png" alt="Loading..." className="loader-image" />
        <p className="loader-text">Creating your quiz...</p>
        <div className="progress-container">
          <p className="progress-text">{progress}%</p>
        </div>
      </div>
    </div>
  );
};

export default CreatingQuizLoader;
