import express from 'express';
import { protect } from '../middleware/auth.js';
import Portfolio from '../models/Portfolio.js';

const router = express.Router();

/**
 * @route   GET /api/portfolio
 * @desc    Get user's portfolio
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user.id });
    if (!portfolio) {
      return res.json({ items: [] });
    }
    res.json(portfolio);
  } catch (err) {
    console.error('Get portfolio error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   POST /api/portfolio
 * @desc    Add item to portfolio
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  const { url, name } = req.body;
  if (!url || !name) {
    return res.status(400).json({ error: 'URL and name are required' });
  }

  try {
    let portfolio = await Portfolio.findOne({ user: req.user.id });

    if (!portfolio) {
      portfolio = await Portfolio.create({ user: req.user.id, items: [{ url, name }] });
    } else {
      // Check if URL already exists
      if (portfolio.items.some(item => item.url === url)) {
        return res.status(400).json({ error: 'URL already in portfolio' });
      }
      portfolio.items.push({ url, name });
      await portfolio.save();
    }
    res.status(201).json(portfolio);
  } catch (err) {
    console.error('Add to portfolio error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   DELETE /api/portfolio/:itemId
 * @desc    Remove item from portfolio
 * @access  Private
 */
router.delete('/:itemId', protect, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user.id });
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const itemIndex = portfolio.items.findIndex(item => item.id === req.params.itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    portfolio.items.splice(itemIndex, 1);
    await portfolio.save();
    res.json(portfolio);
  } catch (err) {
    console.error('Delete from portfolio error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
