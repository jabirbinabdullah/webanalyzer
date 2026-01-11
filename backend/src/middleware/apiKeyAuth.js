import ApiKey from '../models/ApiKey.js';
import User from '../models/User.js';

export const apiKeyAuth = async (req, res, next) => {
  const key = req.header('X-API-Key');
  if (!key) {
    return next();
  }

  try {
    const apiKey = await ApiKey.findOne({ key });
    if (!apiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const user = await User.findById(apiKey.user).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('API key auth error:', error.message);
    res
      .status(500)
      .json({ error: 'Server error during API key authentication' });
  }
};
