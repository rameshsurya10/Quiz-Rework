/**
 * Authentication utility functions for token parsing and validation
 */
import { jwtDecode } from 'jwt-decode';

/**
 * Parse JWT token to get payload data
 * @param {string} token - JWT token string
 * @returns {Object|null} Decoded payload or null if invalid
 */
export const parseToken = (token) => {
  if (!token) return null;
  
  try {
    // Use jwt-decode library for proper token decoding
    return jwtDecode(token);
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

/**
 * Check if token is valid and not expired
 * @param {string} token - JWT token string
 * @returns {boolean} Whether token is valid
 */
export const isValidToken = (token) => {
  if (!token) return false;
  
  try {
    const payload = parseToken(token);
    if (!payload) return false;
    
    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp > currentTime;
  } catch (error) {
    return false;
  }
};

/**
 * Get user info from stored token
 * @returns {Object|null} User info or null if no valid token
 */
export const getUserFromToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  const payload = parseToken(token);
  return payload ? {
    user_id: payload.user_id,
    email: payload.email,
    role: payload.role,
    exp: payload.exp
  } : null;
};

export default {
  parseToken,
  isValidToken,
  getUserFromToken
};
