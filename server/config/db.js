import mongoose from "mongoose";

// Query hygiene: only fields declared in the schema reach the query filter.
// Avoids accidental full-collection scans from stray/undefined filter keys.
mongoose.set("strictQuery", true);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // Pool sizing — a warm, reused pool avoids paying the TCP+TLS handshake
      // to Atlas on every burst of requests (the dominant per-call latency in
      // local dev against a cloud cluster).
      maxPoolSize: 10,
      minPoolSize: 2,
      // Fail fast instead of hanging ~30s (the driver default) when the
      // cluster is unreachable — surfaces misconfig at startup immediately.
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed ", error.message);
    process.exit(1);
  }
};

export default connectDB;
