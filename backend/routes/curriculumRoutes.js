import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import Curriculum from "../models/Curriculum.js";
import mongoose from "mongoose";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "text/csv" ||
      /\.(xlsx|xls|csv)$/i.test(file.originalname);
    cb(ok ? null : new Error("Only Excel or CSV allowed"), ok);
  },
});

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

// Helper to normalize column names
const normalizeCol = (name) =>
  (name || "").toString().toLowerCase().trim().replace(/\s+/g, " ");
const findCol = (row, variations) => {
  for (const key of Object.keys(row)) {
    const n = normalizeCol(key);
    if (variations.some((v) => n.includes(v.toLowerCase()))) return key;
  }
  return null;
};

// POST upload objectives Excel: expects Grade, Code, Title, Description (flexible column names)
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: "Database not connected",
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
        message: "Please select an Excel or CSV file.",
        solution: "Click 'Upload Objectives' and choose a file with columns in this exact order: Grade, Subject, Code, Title, Description.",
      });
    }

    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: "Invalid file",
        message: "Could not read the file as Excel or CSV.",
        solution: "Save your file as .xlsx, .xls, or .csv and ensure it is not corrupted. The first row must contain headers: Grade, Subject, Code, Title, Description (in that order).",
      });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        error: "Empty file",
        message: "The file has no data rows.",
        solution: "Add at least one data row below the header row. Header must be: Grade, Subject, Code, Title, Description (in that order).",
      });
    }

    const gradeCol = findCol(rows[0], ["grade", "class", "level"]);
    const subjectCol = findCol(rows[0], ["subject"]);
    const codeCol = findCol(rows[0], ["code", "objective code", "obj code"]);
    const titleCol = findCol(rows[0], ["title", "topic", "name", "objective title"]);
    const descCol = findCol(rows[0], ["description", "desc", "learning objective"]);

    if (!gradeCol) {
      return res.status(400).json({
        success: false,
        error: "Missing required column",
        message: "The file must have a Grade column (e.g. Grade, Class, Level).",
        solution: "Use an Excel file with columns in this exact order: Grade, Subject, Code, Title, Description. Ensure the first row contains these headers.",
      });
    }
    if (!subjectCol) {
      return res.status(400).json({
        success: false,
        error: "Missing required column",
        message: "The file must have a Subject column.",
        solution: "Use an Excel file with columns in this exact order: Grade, Subject, Code, Title, Description. Add a 'Subject' column after Grade.",
      });
    }

    const byGrade = {};
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const gradeRaw = row[gradeCol];
      const gradeNum = parseInt(gradeRaw, 10);
      if (isNaN(gradeNum) || gradeNum < 1) continue;

      const subject = subjectCol && row[subjectCol] != null ? String(row[subjectCol]).trim() : "";
      const code = codeCol && row[codeCol] != null ? String(row[codeCol]).trim() : "";
      const title = titleCol && row[titleCol] != null ? String(row[titleCol]).trim() : "";
      const description = descCol && row[descCol] != null ? String(row[descCol]).trim() : "";

      if (!byGrade[gradeNum]) byGrade[gradeNum] = [];
      byGrade[gradeNum].push({ subject, code, title, description });
    }

    const grades = Object.keys(byGrade).map(Number);
    if (grades.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid data",
        message: "No valid grade and objective rows found. Ensure Grade is a number (1 or higher).",
        solution: "Check that your data rows have numeric grades in the Grade column and that columns follow the order: Grade, Subject, Code, Title, Description.",
      });
    }

    let added = 0;
    let updated = 0;

    for (const grade of grades) {
      const objectives = byGrade[grade];
      const existing = await Curriculum.findOne({ grade });

      if (existing) {
        const current = existing.objectives || [];
        const combined = [...current, ...objectives];
        existing.objectives = combined;
        await existing.save();
        updated++;
      } else {
        await Curriculum.create({
          id: grade,
          grade,
          objectives,
        });
        added++;
      }
    }

    res.json({
      success: true,
      message: `Objectives uploaded: ${added} new grade(s), ${updated} grade(s) updated.`,
      added,
      updated,
      gradesProcessed: grades.length,
    });
  } catch (err) {
    console.error("Error uploading objectives:", err);
    const message = err.message || "An error occurred while processing the file.";
    const solution = "Ensure your file is a valid Excel (.xlsx, .xls) or CSV with columns in this exact order: Grade, Subject, Code, Title, Description. Check that the first row contains these headers and that Grade contains numbers.";
    res.status(500).json({
      success: false,
      error: "Upload failed",
      message,
      solution,
    });
  }
});

// DELETE all objectives (all grade documents)
router.delete("/all", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: "Database not connected",
      });
    }
    const result = await Curriculum.deleteMany({});
    res.json({
      success: true,
      message: `Deleted all objectives (${result.deletedCount} grade document(s)).`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error deleting all objectives:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete objectives",
      message: err.message || "An error occurred.",
    });
  }
});

// DELETE a single objective by grade and serial number (index, 0-based)
router.delete("/objective", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: "Database not connected",
      });
    }
    const { grade, index } = req.body;
    const gradeNum = parseInt(grade, 10);
    if (isNaN(gradeNum) || gradeNum < 1) {
      return res.status(400).json({
        success: false,
        error: "Valid grade is required",
      });
    }
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({
        success: false,
        error: "Valid index (serial number) is required",
      });
    }
    const doc = await Curriculum.findOne({ grade: gradeNum });
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: "Grade not found",
        message: "No curriculum found for this grade.",
      });
    }
    const objectives = doc.objectives || [];
    if (idx >= objectives.length) {
      return res.status(404).json({
        success: false,
        error: "Objective not found",
        message: "No objective at this serial number in this grade.",
      });
    }
    doc.objectives.splice(idx, 1);
    await doc.save();
    res.json({
      success: true,
      message: "Objective deleted successfully.",
    });
  } catch (err) {
    console.error("Error deleting objective:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete objective",
      message: err.message || "An error occurred.",
    });
  }
});

// PUT update a single objective by grade and serial number (index, 0-based)
router.put("/objective", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: "Database not connected",
      });
    }
    const { grade, index, title, description, subject, code } = req.body;
    const gradeNum = parseInt(grade, 10);
    if (isNaN(gradeNum) || gradeNum < 1) {
      return res.status(400).json({
        success: false,
        error: "Valid grade is required",
      });
    }
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({
        success: false,
        error: "Valid index (serial number) is required",
      });
    }
    const doc = await Curriculum.findOne({ grade: gradeNum });
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: "Grade not found",
        message: "No curriculum found for this grade.",
      });
    }
    const objectives = doc.objectives || [];
    if (idx >= objectives.length) {
      return res.status(404).json({
        success: false,
        error: "Objective not found",
        message: "No objective at this serial number in this grade.",
      });
    }
    if (subject !== undefined) doc.objectives[idx].subject = String(subject).trim();
    if (title !== undefined) doc.objectives[idx].title = String(title).trim();
    if (description !== undefined) doc.objectives[idx].description = String(description).trim();
    if (code !== undefined) doc.objectives[idx].code = String(code).trim();
    await doc.save();
    res.json({
      success: true,
      message: "Objective updated successfully.",
    });
  } catch (err) {
    console.error("Error updating objective:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update objective",
      message: err.message || "An error occurred.",
    });
  }
});

// DELETE multiple objectives (body: { items: [{ grade, index }, ...] } – index = 0-based serial number)
router.delete("/objectives/selected", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: "Database not connected",
      });
    }
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Items required",
        message: "Provide an array of { grade, index } to delete.",
      });
    }
    let deletedCount = 0;
    const byGrade = {};
    for (const it of items) {
      const g = parseInt(it.grade, 10);
      const idx = parseInt(it.index, 10);
      if (isNaN(g) || isNaN(idx) || idx < 0) continue;
      if (!byGrade[g]) byGrade[g] = new Set();
      byGrade[g].add(idx);
    }
    for (const [gradeStr, indices] of Object.entries(byGrade)) {
      const gradeNum = parseInt(gradeStr, 10);
      const doc = await Curriculum.findOne({ grade: gradeNum });
      if (!doc || !doc.objectives || !doc.objectives.length) continue;
      const toRemove = new Set(indices);
      const before = doc.objectives.length;
      doc.objectives = doc.objectives.filter((_, i) => !toRemove.has(i));
      deletedCount += before - doc.objectives.length;
      await doc.save();
    }
    res.json({
      success: true,
      message: `Deleted ${deletedCount} objective(s).`,
      deletedCount,
    });
  } catch (err) {
    console.error("Error deleting selected objectives:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete objectives",
      message: err.message || "An error occurred.",
    });
  }
});

// POST add a single objective
router.post("/objective", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: "Database not connected",
      });
    }
    const { grade, subject, code, title, description } = req.body;
    const gradeNum = parseInt(grade, 10);
    if (isNaN(gradeNum) || gradeNum < 1) {
      return res.status(400).json({
        success: false,
        error: "Valid grade is required (number, 1 or higher)",
      });
    }
    const objective = {
      subject: subject != null ? String(subject).trim() : "",
      code: code != null ? String(code).trim() : "",
      title: title != null ? String(title).trim() : "",
      description: description != null ? String(description).trim() : "",
    };
    const existing = await Curriculum.findOne({ grade: gradeNum });
    if (existing) {
      existing.objectives = existing.objectives || [];
      existing.objectives.push(objective);
      await existing.save();
    } else {
      await Curriculum.create({
        id: gradeNum,
        grade: gradeNum,
        objectives: [objective],
      });
    }
    res.status(201).json({
      success: true,
      message: "Objective added successfully.",
    });
  } catch (err) {
    console.error("Error adding objective:", err);
    res.status(500).json({
      success: false,
      error: "Failed to add objective",
      message: err.message || "An error occurred.",
    });
  }
});

// Get single grade by id (must be after /upload to avoid "upload" as id)
router.get("/:id", async (req, res) => {
  try {
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
