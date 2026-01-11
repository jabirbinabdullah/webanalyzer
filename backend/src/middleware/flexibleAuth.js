import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiKey from '../models/ApiKey.js';

export const flexibleAuth = async (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  const token = req.headers.authorization?.split(' ')[1];

  if (apiKey) {
    try {
      const key = await ApiKey.findOne({ key: apiKey });
      if (!key) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const user = await User.findById(key.user).select('-password');
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      req.user = user;
      return next();
    } catch (error) {
      console.error('API key auth error:', error.message);
      return res
        .status(500)
        .json({ error: 'Server error during API key authentication' });
    }
  } else if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your_jwt_secret'
      );
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res
          .status(401)
          .json({ error: 'Not authorized, user not found' });
      }
      return next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  } else {
    // If no API key or token, and the route is intended to be protected,
    // we should deny access. If it's optional, we can just call next().
    // For the /api/analyze route, we want to ensure we have a user if either is provided.
    // If neither is, we can allow anonymous analysis if that's a desired feature.
    // In this case, we'll assume anonymous analysis is not desired for this route.
    return res
      .status(401)
      .json({ error: 'Not authorized, no token or API key' });
  }
};
