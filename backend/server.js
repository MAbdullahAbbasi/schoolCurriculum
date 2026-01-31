import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import curriculumRoutes from "./routes/curriculumRoutes.js";
import studentDataRoutes from "./routes/studentDataRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import recordRoutes from "./routes/recordRoutes.js";

dotenv.config();

const app = express();

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
  console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Mongoose disconnected from MongoDB');
});

app.use(cors());
app.use(express.json());

// Check if MONGO_URI is set
if (!process.env.MONGO_URI) {
  console.error("ERROR: MONGO_URI environment variable is not set!");
  console.error("Please create a .env file in the backend directory with: MONGO_URI=your_mongodb_atlas_connection_string");
  process.exit(1);
}

// MongoDB Atlas connection with proper options
const connectDB = async (retryCount = 0) => {
  try {
    let mongoUri = process.env.MONGO_URI;
    
    // Ensure the connection string includes the SchoolCurriculum database
    // Replace any existing database name with SchoolCurriculum
    if (mongoUri.includes('/') && !mongoUri.includes('/SchoolCurriculum')) {
      // Replace the database name in the URI
      mongoUri = mongoUri.replace(/\/[^/?]+(\?|$)/, '/SchoolCurriculum$1');
      console.log("Set database to SchoolCurriculum in connection string");
    } else if (!mongoUri.includes('/')) {
      // No database specified, add it
      mongoUri = mongoUri.endsWith('/') ? mongoUri + 'SchoolCurriculum' : mongoUri + '/SchoolCurriculum';
      console.log("Added SchoolCurriculum database to connection string");
    }
    
    const conn = await mongoose.connect(mongoUri, {
      // These options are recommended for MongoDB Atlas
      serverSelectionTimeoutMS: 10000, // Increased timeout for connection
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    
    console.log(`✅ MongoDB connected successfully: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.db.databaseName}`);
    console.log(`📁 Collection: objectives`);
    return true;
  } catch (err) {
    console.error(`❌ MongoDB connection error (attempt ${retryCount + 1}):`, err.message);
    if (err.message.includes('IP') || err.message.includes('whitelist')) {
      console.error("⚠️  IP Whitelist Issue:");
      console.error("   1. Go to MongoDB Atlas → Network Access");
      console.error("   2. Click 'Add IP Address'");
      console.error("   3. Select 'Add Current IP Address' or 'Allow Access from Anywhere' (0.0.0.0/0)");
      console.error("   4. Wait 1-2 minutes for changes to propagate");
    }
    return false;
  }
};

// Auto-reconnect logic
const attemptReconnect = async () => {
  let retryCount = 0;
  const maxRetries = 10;
  const retryInterval = 10000; // 10 seconds

  const tryConnect = async () => {
    if (mongoose.connection.readyState === 1) {
      console.log("✅ MongoDB is already connected");
      return;
    }

    if (retryCount < maxRetries) {
      console.log(`🔄 Attempting to connect to MongoDB... (${retryCount + 1}/${maxRetries})`);
      const connected = await connectDB(retryCount);
      
      if (!connected) {
        retryCount++;
        setTimeout(tryConnect, retryInterval);
      } else {
        retryCount = 0; // Reset on success
      }
    } else {
      console.error("❌ Max reconnection attempts reached. Please check your MongoDB settings.");
    }
  };

  // Initial connection attempt
  await connectDB(0);
  
  // Set up periodic reconnection attempts
  if (mongoose.connection.readyState !== 1) {
    setTimeout(tryConnect, retryInterval);
  }
};

// Start server (will attempt to connect to MongoDB but won't block server startup)
const startServer = async () => {
  // Attempt to connect to MongoDB with auto-reconnect (non-blocking)
  attemptReconnect();

app.get("/", (req, res) => {
    res.json({ 
      status: "API is running",
      mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
    });
});

// Use curriculum routes
app.use("/api/curriculum", curriculumRoutes);

// Use students data routes
app.use("/api/students-data", studentDataRoutes);

// Use course routes
app.use("/api/courses", courseRoutes);

// Use record routes
app.use("/api/records", recordRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
    console.log(`MongoDB connection status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    if (mongoose.connection.readyState !== 1) {
      console.log("⚠️  WARNING: MongoDB is not connected. Please check:");
      console.log("   1. Your IP address is whitelisted in MongoDB Atlas");
      console.log("   2. Your MONGO_URI in .env is correct");
      console.log("   3. Your network connection is working");
    }
  });
};

// Start the application
startServer();
