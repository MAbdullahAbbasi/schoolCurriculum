import express from "express";
import Curriculum from "../models/Curriculum.js";
import mongoose from "mongoose";

const router = express.Router();

// Debug endpoint to check database collections
router.get("/debug/collections", async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    res.json({
      database: mongoose.connection.db.databaseName,
      collections: collectionNames,
      expectedCollection: Curriculum.collection.name,
      connectionState: mongoose.connection.readyState
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all grades
router.get("/", async (req, res) => {
  try {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    console.log(`Database connection state: ${dbState} (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)`);
    
    if (dbState !== 1) {
      return res.status(503).json({ 
        error: "Database not connected",
        message: "MongoDB connection is not established. Please check your connection settings and IP whitelist.",
        connectionState: dbState
      });
    }
    
    // Get collection name
    const collectionName = Curriculum.collection.name;
    console.log(`Querying collection: ${collectionName}`);
    
    // Count total documents
    const count = await Curriculum.countDocuments({});
    console.log(`Total documents in collection: ${count}`);
    
    const data = await Curriculum.find({});
    console.log(`Found ${data.length} curriculum records`);
    
    if (data.length === 0) {
      console.warn("WARNING: No data found in the database. Please check:");
      console.warn("1. Is the collection name correct? (Expected: 'objectives')");
      console.warn("2. Is the database name correct? (Expected: 'SchoolCurriculum')");
      console.warn("3. Does the collection exist in MongoDB Atlas?");
      console.warn("4. Have you inserted any data into the collection?");
    }
    
    res.json(data);
  } catch (err) {
    console.error("Error fetching curriculum data:", err);
    res.status(500).json({ 
      error: "Database error",
      message: err.message 
    });
  }
});

// Get single grade by id
router.get("/:id", async (req, res) => {
  try {
    // Ensure id is a number
    const gradeId = Number(req.params.id);
    console.log(`Fetching curriculum for grade ID: ${gradeId}`);

    const data = await Curriculum.findOne({ id: gradeId });
    if (!data) {
      console.log(`Grade ${gradeId} not found`);
      return res.status(404).json({ message: "Grade not found" });
    }
    res.json(data);
  } catch (err) {
    console.error("Error fetching grade data:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
