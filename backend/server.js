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
  console.error("❌ ERROR: MONGO_URI environment variable is not set!");
  console.error("📝 For Render deployment:");
  console.error("   1. Go to your Render service → Environment");
  console.error("   2. Add environment variable: MONGO_URI");
  console.error("   3. Value should be: mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority");
  console.error("   4. Replace username, password, and cluster with your actual MongoDB Atlas credentials");
  process.exit(1);
}

// Validate MONGO_URI format
const mongoUriValue = process.env.MONGO_URI.trim();
if (!mongoUriValue.startsWith('mongodb://') && !mongoUriValue.startsWith('mongodb+srv://')) {
  console.error("❌ ERROR: MONGO_URI format is incorrect!");
  console.error(`   Current value: ${mongoUriValue.substring(0, 50)}${mongoUriValue.length > 50 ? '...' : ''}`);
  console.error("");
  console.error("   MONGO_URI must start with 'mongodb://' or 'mongodb+srv://'");
  console.error("   Example: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority");
  console.error("");
  console.error("📝 To fix in Render:");
  console.error("   1. Go to your Render service → Environment tab");
  console.error("   2. Find MONGO_URI environment variable");
  console.error("   3. Update it with your full MongoDB Atlas connection string");
  console.error("   4. Get your connection string from MongoDB Atlas → Connect → Connect your application");
  process.exit(1);
}

// MongoDB Atlas connection with proper options
const connectDB = async (retryCount = 0) => {
  try {
    let mongoUri = mongoUriValue; // Use the validated and trimmed value
    
    // Log connection attempt (without password) - only on first attempt
    if (retryCount === 0) {
      const uriPreview = mongoUri.replace(/:[^:@]+@/, ':****@');
      console.log(`🔗 Connecting to MongoDB... (${uriPreview.substring(0, 60)}...)`);
    }
    
    // Ensure the connection string includes the SchoolCurriculum database
    // Use a more reliable method: split by ? to separate query params, then handle the base URI
    const hasQuery = mongoUri.includes('?');
    const parts = hasQuery ? mongoUri.split('?') : [mongoUri, ''];
    let baseUri = parts[0];
    const queryString = parts[1] || '';
    
    // Find where the hostname ends (after @ symbol and before / or end of string)
    // Format: mongodb+srv://username:password@cluster.mongodb.net[/database]
    const atIndex = baseUri.indexOf('@');
    if (atIndex === -1) {
      throw new Error('Invalid MongoDB connection string: missing @ symbol');
    }
    
    // Find the hostname part (everything after @)
    const afterAt = baseUri.substring(atIndex + 1);
    const slashIndex = afterAt.indexOf('/');
    
    if (slashIndex === -1) {
      // No database specified, add it
      mongoUri = baseUri + '/SchoolCurriculum' + (queryString ? '?' + queryString : '');
      if (retryCount === 0) console.log("Added SchoolCurriculum database to connection string");
    } else {
      // Database might be specified
      const currentDb = afterAt.substring(slashIndex + 1).split('?')[0].split('/')[0];
      if (!currentDb || currentDb.trim() === '') {
        // Empty database name, add SchoolCurriculum
        mongoUri = baseUri + 'SchoolCurriculum' + (queryString ? '?' + queryString : '');
        if (retryCount === 0) console.log("Added SchoolCurriculum database to connection string");
      } else if (currentDb !== 'SchoolCurriculum') {
        // Different database, replace it - be careful to preserve the structure
        const beforeDb = baseUri.substring(0, atIndex + 1 + slashIndex + 1);
        mongoUri = beforeDb + 'SchoolCurriculum' + (queryString ? '?' + queryString : '');
        if (retryCount === 0) console.log("Set database to SchoolCurriculum in connection string");
      }
      // If it's already SchoolCurriculum, use as-is
    }
    
    // Reconstruct full URI
    if (queryString && !mongoUri.includes('?')) {
      mongoUri = mongoUri + '?' + queryString;
    }
    
    // Validate the final URI before connecting
    if (!mongoUri.includes('@') || !mongoUri.match(/@[^/]+/)) {
      throw new Error(`Invalid MongoDB URI format after processing. URI must contain hostname after @ symbol.`);
    }
    
    // Log final URI (without password) for debugging - only on first attempt
    if (retryCount === 0) {
      const finalUriPreview = mongoUri.replace(/:[^:@]+@/, ':****@');
      console.log(`📝 Final connection URI: ${finalUriPreview.substring(0, 80)}...`);
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
    
    // Provide specific error guidance
    if (err.message.includes('IP') || err.message.includes('whitelist')) {
      console.error("⚠️  IP Whitelist Issue:");
      console.error("   1. Go to MongoDB Atlas → Network Access");
      console.error("   2. Click 'Add IP Address'");
      console.error("   3. Select 'Add Current IP Address' or 'Allow Access from Anywhere' (0.0.0.0/0)");
      console.error("   4. Wait 1-2 minutes for changes to propagate");
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('querySrv')) {
      console.error("⚠️  Connection String Issue:");
      console.error("   1. Check that MONGO_URI in Render environment variables is correct");
      console.error("   2. MONGO_URI should start with 'mongodb+srv://' for Atlas");
      console.error("   3. Format: mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority");
      console.error("   4. Make sure your MongoDB Atlas username and password are correct");
    } else if (err.message.includes('authentication failed') || err.message.includes('bad auth')) {
      console.error("⚠️  Authentication Issue:");
      console.error("   1. Check your MongoDB Atlas username and password");
      console.error("   2. Make sure special characters in password are URL-encoded");
      console.error("   3. Verify the database user has proper permissions");
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
