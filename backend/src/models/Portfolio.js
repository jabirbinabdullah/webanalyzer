import mongoose from 'mongoose';

const PortfolioItemSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const PortfolioSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: [PortfolioItemSchema],
});

const Portfolio = mongoose.model('Portfolio', PortfolioSchema);

export default Portfolio;
