import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Note: This connects to a local MongoDB instance.
    // Make sure you have MongoDB installed and running.
    // You can use a different connection string for a cloud-based MongoDB instance.
    await mongoose.connect('mongodb://localhost/webanalyzer', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    // During tests we don't want to exit the process (Jest runner).
    if (process.env.NODE_ENV === 'test') {
      console.warn('Skipping process.exit in test environment');
      return;
    }
    // Exit process with failure for non-test environments
    process.exit(1);
  }
};

export default connectDB;
