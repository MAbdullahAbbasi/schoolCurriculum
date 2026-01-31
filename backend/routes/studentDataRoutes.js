import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import mongoose from 'mongoose';
import StudentData from '../models/StudentData.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel and CSV files
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    
    if (allowedMimes.includes(file.mimetype) || 
        file.originalname.endsWith('.xlsx') || 
        file.originalname.endsWith('.xls') || 
        file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload an Excel file (.xlsx, .xls, or .csv)'), false);
    }
  },
});

// GET all students data
router.get('/', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Database not connected',
        message: 'MongoDB is not connected. Please check your connection settings.',
      });
    }

    const students = await StudentData.find({}).limit(1000); // Limit to 1000 records for performance
    
    if (students.length === 0) {
      return res.json([]);
    }

    // Convert to plain objects and format dates
    const studentsData = students.map(student => {
      const studentObj = student.toObject();
      // Format date of birth as ISO string for frontend
      if (studentObj.dateOfBirth) {
        studentObj.dateOfBirth = new Date(studentObj.dateOfBirth).toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      // Remove MongoDB internal fields
      delete studentObj._id;
      delete studentObj.__v;
      delete studentObj.createdAt;
      delete studentObj.updatedAt;
      return studentObj;
    });

    res.json(studentsData);
  } catch (error) {
    console.error('Error fetching students data:', error);
    res.status(500).json({
      error: 'Failed to fetch students data',
      message: error.message,
    });
  }
});

// POST upload Excel file and save to database
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'MongoDB is not connected. Please check your connection settings.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please select a file to upload.',
      });
    }

    // Parse Excel file
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    } catch (parseError) {
      console.error('Error parsing Excel file:', parseError);
      return res.status(400).json({
        success: false,
        error: 'Invalid file format',
        message: 'Failed to parse the Excel file. Please ensure it is a valid Excel file.',
      });
    }

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      defval: '', // Default value for empty cells
      raw: false, // Convert all values to strings
    });

    if (jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Empty file',
        message: 'The Excel file appears to be empty or has no data.',
      });
    }

    // Function to normalize column names (case-insensitive, trim spaces)
    const normalizeColumnName = (name) => {
      if (!name) return '';
      return name.toString().toLowerCase().trim().replace(/\s+/g, ' ');
    };

    // Function to find column name with variations
    const findColumn = (data, variations) => {
      const keys = Object.keys(data);
      for (const key of keys) {
        const normalized = normalizeColumnName(key);
        if (variations.some(v => normalized.includes(v.toLowerCase()))) {
          return key;
        }
      }
      return null;
    };

    // Map Excel data to schema fields
    const mappedData = jsonData.map((row, index) => {
      const mapped = {};

      // Find registration number column
      const regNumKey = findColumn(row, ['registration', 'reg', 'reg no', 'reg number', 'registration number']);
      if (!regNumKey || !row[regNumKey]) {
        throw new Error(`Row ${index + 2}: Registration Number is required`);
      }
      mapped.registrationNumber = String(row[regNumKey]).trim();

      // Find student name column
      const nameKey = findColumn(row, ['name', 'student name', 'student\'s name', 'student', 'full name']);
      if (!nameKey || !row[nameKey]) {
        throw new Error(`Row ${index + 2}: Student Name is required`);
      }
      mapped.studentName = String(row[nameKey]).trim();

      // Find grade column
      const gradeKey = findColumn(row, ['grade', 'class', 'level', 'standard']);
      if (!gradeKey || !row[gradeKey]) {
        throw new Error(`Row ${index + 2}: Grade is required`);
      }
      mapped.grade = String(row[gradeKey]).trim();

      // Find date of birth column
      const dobKey = findColumn(row, ['date of birth', 'dob', 'birth date', 'birthdate', 'date']);
      if (!dobKey || !row[dobKey]) {
        throw new Error(`Row ${index + 2}: Date of Birth is required`);
      }

      // Parse date of birth
      let dateOfBirth;
      const dobValue = row[dobKey];
      
      try {
        // If it's already a Date object (from Excel)
        if (dobValue instanceof Date) {
          dateOfBirth = dobValue;
        } else if (typeof dobValue === 'number') {
          // Excel date serial number (days since 1900-01-01)
          // Excel epoch starts on 1900-01-01, but Excel incorrectly treats 1900 as a leap year
          const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
          dateOfBirth = new Date(excelEpoch.getTime() + dobValue * 86400 * 1000);
        } else if (typeof dobValue === 'string') {
          // Try to parse as string date
          // Handle common formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, etc.
          const dateStr = dobValue.trim();
          
          // Try ISO format first
          if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            dateOfBirth = new Date(dateStr);
          } else if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
            // DD/MM/YYYY or MM/DD/YYYY
            const parts = dateStr.split('/');
            // Try DD/MM/YYYY first
            dateOfBirth = new Date(parts[2], parts[1] - 1, parts[0]);
            if (isNaN(dateOfBirth.getTime())) {
              // Try MM/DD/YYYY
              dateOfBirth = new Date(parts[2], parts[0] - 1, parts[1]);
            }
          } else {
            // Try general date parsing
            dateOfBirth = new Date(dateStr);
          }
        } else {
          throw new Error(`Invalid date value type: ${typeof dobValue}`);
        }

        // Validate date
        if (!dateOfBirth || isNaN(dateOfBirth.getTime())) {
          throw new Error(`Invalid date format: ${dobValue}`);
        }

        // Check if date is reasonable (not in the future, not too old)
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        const minDate = new Date('1900-01-01');
        
        if (dateOfBirth > today) {
          throw new Error(`Date of Birth cannot be in the future`);
        }
        if (dateOfBirth < minDate) {
          throw new Error(`Date of Birth is too old (before 1900)`);
        }

        mapped.dateOfBirth = dateOfBirth;
      } catch (dateError) {
        throw new Error(`Row ${index + 2}: ${dateError.message}`);
      }

      return mapped;
    });

    // Clear existing data (optional - you might want to keep existing data)
    // Uncomment the next line if you want to replace all data on each upload
    // await StudentData.deleteMany({});

    // Insert data into MongoDB
    try {
      // Insert all records
      const insertedData = await StudentData.insertMany(mappedData, {
        ordered: false, // Continue inserting even if some documents fail
      });

      console.log(`✅ Successfully inserted ${insertedData.length} student records`);

      res.json({
        success: true,
        message: `Successfully uploaded ${insertedData.length} student records`,
        count: insertedData.length,
      });
    } catch (insertError) {
      console.error('Error inserting data:', insertError);
      
      // Check if it's a duplicate key error
      if (insertError.code === 11000) {
        return res.status(400).json({
          success: false,
          error: 'Duplicate data',
          message: 'Some records already exist in the database. Please check for duplicates.',
        });
      }

      // Check if it's a bulk write error
      if (insertError.name === 'BulkWriteError') {
        const inserted = insertError.result.insertedCount || 0;
        const errors = insertError.writeErrors || [];
        
        return res.status(207).json({
          success: true,
          message: `Partially successful: ${inserted} records inserted, ${errors.length} errors`,
          count: inserted,
          errors: errors.slice(0, 5), // Return first 5 errors
        });
      }

      throw insertError;
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message || 'An error occurred while processing the file.',
    });
  }
});

export default router;
