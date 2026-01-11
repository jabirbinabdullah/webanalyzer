import express from 'express';
import { protect } from '../middleware/auth.js';
import ApiKey from '../models/ApiKey.js';

const router = express.Router();

/**
 * @route   GET /api/keys
 * @desc    Get all API keys for a user
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const keys = await ApiKey.find({ user: req.user.id });
    res.json(keys);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   POST /api/keys
 * @desc    Generate a new API key
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const newKey = new ApiKey({
      user: req.user.id,
    });

    await newKey.save();
    res.status(201).json(newKey);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   DELETE /api/keys/:id
 * @desc    Delete an API key
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const key = await ApiKey.findById(req.params.id);

    if (!key) {
      return res.status(404).json({ msg: 'API key not found' });
    }

    // Make sure user owns the key
    if (key.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await key.remove();

    res.json({ msg: 'API key removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'API key not found' });
    }
    res.status(500).send('Server Error');
  }
});

export default router;
