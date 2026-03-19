import express from 'express';
import mongoose from 'mongoose';
import GradingScheme from '../models/GradingScheme.js';
import { ROLE } from '../rbac/roles.js';
import { requireRoles } from '../rbac/guards.js';

const router = express.Router();

// GET all grading schemes
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const schemes = await GradingScheme.find({}).sort({ startDate: -1, createdAt: -1 });
    res.json({
      success: true,
      data: schemes,
    });
  } catch (error) {
    console.error('Error fetching grading schemes:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to fetch grading schemes',
    });
  }
});

// POST create new grading scheme
router.post('/', requireRoles([ROLE.ADMIN]), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const { name, startDate, endDate, rows } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Name required',
        message: 'Grading scheme name is required',
      });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Dates required',
        message: 'Start date and end date are required',
      });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dates',
        message: 'End date must be on or after start date',
      });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Rows required',
        message: 'At least one percentage/grade row is required',
      });
    }

    const normalizedRows = rows.map((r) => ({
      percentage: String(r?.percentage ?? r?.marks ?? '').trim(),
      grade: String(r?.grade ?? '').trim(),
    })).filter((r) => r.percentage !== '' && r.grade !== '');

    if (normalizedRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Rows required',
        message: 'At least one valid percentage/grade row is required',
      });
    }
    const hasInvalidPercentage = normalizedRows.some((r) => {
      const value = Number(r.percentage);
      return !Number.isFinite(value) || value < 0 || value > 100;
    });
    if (hasInvalidPercentage) {
      return res.status(400).json({
        success: false,
        error: 'Invalid percentage',
        message: 'Percentage must be between 0 and 100',
      });
    }

    const created = await GradingScheme.create({
      name: String(name).trim(),
      startDate: start,
      endDate: end,
      rows: normalizedRows,
    });

    res.status(201).json({
      success: true,
      message: 'Grading scheme created successfully',
      data: created,
    });
  } catch (error) {
    console.error('Error creating grading scheme:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to create grading scheme',
    });
  }
});

// PUT update grading scheme
router.put('/:id', requireRoles([ROLE.ADMIN]), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID required',
        message: 'Grading scheme id is required',
      });
    }

    const { name, startDate, endDate, rows } = req.body || {};
    const update = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          error: 'Name required',
          message: 'Grading scheme name is required',
        });
      }
      update.name = String(name).trim();
    }

    if (startDate !== undefined || endDate !== undefined) {
      const scheme = await GradingScheme.findById(id);
      if (!scheme) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Grading scheme not found',
        });
      }
      const start = startDate !== undefined ? new Date(startDate) : scheme.startDate;
      const end = endDate !== undefined ? new Date(endDate) : scheme.endDate;
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        return res.status(400).json({
          success: false,
          error: 'Invalid dates',
          message: 'End date must be on or after start date',
        });
      }
      update.startDate = start;
      update.endDate = end;
    }

    if (rows !== undefined) {
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Rows required',
          message: 'At least one percentage/grade row is required',
        });
      }
      const normalizedRows = rows.map((r) => ({
        percentage: String(r?.percentage ?? r?.marks ?? '').trim(),
        grade: String(r?.grade ?? '').trim(),
      })).filter((r) => r.percentage !== '' && r.grade !== '');
      if (normalizedRows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Rows required',
          message: 'At least one valid percentage/grade row is required',
        });
      }
      const hasInvalidPercentage = normalizedRows.some((r) => {
        const value = Number(r.percentage);
        return !Number.isFinite(value) || value < 0 || value > 100;
      });
      if (hasInvalidPercentage) {
        return res.status(400).json({
          success: false,
          error: 'Invalid percentage',
          message: 'Percentage must be between 0 and 100',
        });
      }
      update.rows = normalizedRows;
    }

    const updated = await GradingScheme.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Grading scheme not found',
      });
    }

    res.json({
      success: true,
      message: 'Grading scheme updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating grading scheme:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to update grading scheme',
    });
  }
});

// DELETE a single grading scheme
router.delete('/:id', requireRoles([ROLE.ADMIN]), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID required',
        message: 'Grading scheme id is required',
      });
    }
    const deleted = await GradingScheme.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Grading scheme not found',
      });
    }
    res.json({
      success: true,
      message: 'Grading scheme deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting grading scheme:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to delete grading scheme',
    });
  }
});

// DELETE all grading schemes
router.delete('/', requireRoles([ROLE.ADMIN]), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }
    const result = await GradingScheme.deleteMany({});
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} grading scheme(s).`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting grading schemes:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to delete grading schemes',
    });
  }
});

export default router;

