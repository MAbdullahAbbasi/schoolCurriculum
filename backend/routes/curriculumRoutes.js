import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import Curriculum from "../models/Curriculum.js";
import mongoose from "mongoose";
import { ROLE } from '../rbac/roles.js';
import { requireRoles } from '../rbac/guards.js';

const router = express.Router();

// System-level protection: only Admins can write curriculum data.
router.use((req, res, next) => {
  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (writeMethods.includes(req.method)) {
    return requireRoles([ROLE.ADMIN])(req, res, next);
  }
  return next();
});

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
router.get("/debug/collections", requireRoles([ROLE.ADMIN]), async (req, res) => {
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

// Get all grades; optional ?subject=English returns only objectives with that subject (case-insensitive)
router.get("/", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB connection is not established. Please check your connection settings and IP whitelist.",
        connectionState: dbState,
      });
    }

    const subjectParam = req.query.subject;
    const filterBySubject =
      subjectParam != null && String(subjectParam).trim() !== "";
    const subjectLower = filterBySubject
      ? String(subjectParam).trim().toLowerCase()
      : null;

    const docs = await Curriculum.find({}).lean();
    let data = docs;

    if (filterBySubject && subjectLower) {
      data = docs
        .map((grade) => {
          const objectives = (grade.objectives || []).filter((obj) => {
            const objSubject = String(obj.subject ?? "").trim().toLowerCase();
            return objSubject === subjectLower;
          });
          return { ...grade, objectives };
        })
        .filter((grade) => grade.objectives && grade.objectives.length > 0);
    }

    if (data.length === 0 && docs.length > 0) {
      console.warn(
        "No curriculum records match the requested subject filter."
      );
    }

    res.json(data);
  } catch (err) {
    console.error("Error fetching curriculum data:", err);
    res.status(500).json({
      error: "Database error",
      message: err.message,
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

// Normalize grade from Excel: accept numeric (1,2,3...) or KG variants -> "KG-1", "KG-2", "KG-3"
const KG_PATTERNS = [
  { regex: /^kg[- ]?1$|^kg[- ]?i$/i, value: "KG-1" },
  { regex: /^kg[- ]?2$|^kg[- ]?ii$/i, value: "KG-2" },
  { regex: /^kg[- ]?3$|^kg[- ]?iii$/i, value: "KG-3" },
];
function normalizeGrade(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  const num = parseInt(s, 10);
  if (!Number.isNaN(num) && num >= 1) return num;
  const normalized = s.replace(/\s+/g, " ").trim();
  for (const { regex, value } of KG_PATTERNS) {
    if (regex.test(normalized)) return value;
  }
  return null;
}

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
      const gradeValue = normalizeGrade(gradeRaw);
      if (gradeValue == null) continue;

      const subject = subjectCol && row[subjectCol] != null ? String(row[subjectCol]).trim() : "";
      const code = codeCol && row[codeCol] != null ? String(row[codeCol]).trim() : "";
      const title = titleCol && row[titleCol] != null ? String(row[titleCol]).trim() : "";
      const description = descCol && row[descCol] != null ? String(row[descCol]).trim() : "";

      const key = String(gradeValue);
      if (!byGrade[key]) byGrade[key] = [];
      byGrade[key].push({ subject, code, title, description });
    }

    const grades = Object.keys(byGrade);
    if (grades.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid data",
        message: "No valid grade and objective rows found. Use numeric grades (1, 2, 3...) or KG variants (KG-1, KG-I, KG 1, KG I, KG-2, KG-II, KG 3, KG III, etc.).",
        solution: "Grade column must be a number (1 or higher) or one of: KG-1/KG-I/KG 1/KG I, KG-2/KG-II/KG 2/KG II, KG-3/KG-III/KG 3/KG III.",
      });
    }

    let added = 0;
    let updated = 0;

    for (const gradeKey of grades) {
      const objectives = byGrade[gradeKey];
      const gradeValue = /^\d+$/.test(gradeKey) ? parseInt(gradeKey, 10) : gradeKey;
      const existing = await Curriculum.findOne({ grade: gradeValue });

      if (existing) {
        const current = existing.objectives || [];
        const combined = [...current, ...objectives];
        existing.objectives = combined;
        await existing.save();
        updated++;
      } else {
        await Curriculum.create({
          id: gradeValue,
          grade: gradeValue,
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

// Parse grade from request: number (1,2,3...) or string ("KG-1","KG-2","KG-3")
const parseGrade = (grade) => {
  if (grade == null) return null;
  const s = String(grade).trim();
  const num = parseInt(s, 10);
  if (!Number.isNaN(num) && num >= 1) return num;
  if (["KG-1", "KG-2", "KG-3"].includes(s)) return s;
  return null;
};

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
    const gradeValue = parseGrade(grade);
    if (gradeValue == null) {
      return res.status(400).json({
        success: false,
        error: "Valid grade is required (number 1+ or KG-1, KG-2, KG-3)",
      });
    }
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({
        success: false,
        error: "Valid index (serial number) is required",
      });
    }
    const doc = await Curriculum.findOne({ grade: gradeValue });
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
    const gradeValue = parseGrade(grade);
    if (gradeValue == null) {
      return res.status(400).json({
        success: false,
        error: "Valid grade is required (number 1+ or KG-1, KG-2, KG-3)",
      });
    }
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({
        success: false,
        error: "Valid index (serial number) is required",
      });
    }
    const doc = await Curriculum.findOne({ grade: gradeValue });
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
      const g = parseGrade(it.grade);
      const idx = parseInt(it.index, 10);
      if (g == null || isNaN(idx) || idx < 0) continue;
      const key = String(g);
      if (!byGrade[key]) byGrade[key] = new Set();
      byGrade[key].add(idx);
    }
    for (const [gradeKey, indices] of Object.entries(byGrade)) {
      const gradeValue = /^\d+$/.test(gradeKey) ? parseInt(gradeKey, 10) : gradeKey;
      const doc = await Curriculum.findOne({ grade: gradeValue });
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
    const gradeValue = parseGrade(grade);
    if (gradeValue == null) {
      return res.status(400).json({
        success: false,
        error: "Valid grade is required (number 1+ or KG-1, KG-2, KG-3)",
      });
    }
    const objective = {
      subject: subject != null ? String(subject).trim() : "",
      code: code != null ? String(code).trim() : "",
      title: title != null ? String(title).trim() : "",
      description: description != null ? String(description).trim() : "",
    };
    const existing = await Curriculum.findOne({ grade: gradeValue });
    if (existing) {
      existing.objectives = existing.objectives || [];
      existing.objectives.push(objective);
      await existing.save();
    } else {
      await Curriculum.create({
        id: gradeValue,
        grade: gradeValue,
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
