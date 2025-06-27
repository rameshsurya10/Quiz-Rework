import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const useNavigationLoader = (delay = 150) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsNavigating(true);
    
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [location.pathname, delay]);

  return isNavigating;
};

export default useNavigationLoader; 