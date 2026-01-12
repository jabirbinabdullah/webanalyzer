/* eslint-disable no-console */
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (process.env.SKIP_DB === "true") {
      console.log("SKIP_DB=true  skipping MongoDB connection");
      return;
    }

    // Check if already connected to avoid multiple connection attempts
    if (mongoose.connection.readyState === 1) {
      console.log("MongoDB already connected...");
      return;
    }

    const uri = process.env.MONGO_URI || "mongodb://localhost/webanalyzer";
    await mongoose.connect(uri);
    console.log("MongoDB Connected...");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    if (process.env.NODE_ENV === "test") {
      console.warn("Skipping process.exit in test environment");
      return;
    }
    process.exit(1);
  }
};

export default connectDB;
