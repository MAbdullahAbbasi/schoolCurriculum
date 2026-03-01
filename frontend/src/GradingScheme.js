import React, { useState, useEffect } from 'react';
import CurriculumHeader from './CurriculumHeader';
import './GradingScheme.css';

const STORAGE_KEY = 'curriculum_grading_scheme';

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const saveToStorage = (rows) => {
  try {
    const toSave = rows.map((r) => ({ marks: r.marks, grade: r.grade }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (_) {}
};

let nextId = 1;
const newRow = () => ({ id: nextId++, marks: '', grade: '' });
const rowFromData = (data, index) => ({ id: nextId++, marks: data.marks ?? '', grade: data.grade ?? '' });

const GradingScheme = () => {
  const [rows, setRows] = useState(() => {
    const stored = loadFromStorage();
    if (stored && stored.length > 0) {
      return stored.map((item, i) => rowFromData(item, i));
    }
    return [newRow()];
  });

  useEffect(() => {
    saveToStorage(rows);
  }, [rows]);

  const addRow = () => {
    setRows((prev) => [...prev, newRow()]);
  };

  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  return (
    <div className="grading-scheme-container">
      <CurriculumHeader />
      <div className="grading-scheme-content">
        <h2 className="grading-scheme-title">Grading Scheme</h2>
        <p className="grading-scheme-subtitle">
          Add rows and enter marks (e.g. minimum percentage or score) and the corresponding grade label.
        </p>

        <div className="grading-scheme-table-wrapper">
          <table className="grading-scheme-table">
            <thead>
              <tr>
                <th className="grading-scheme-th">Marks</th>
                <th className="grading-scheme-th">Grade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="grading-scheme-td">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="grading-scheme-input"
                      placeholder="e.g. 90"
                      value={row.marks}
                      onChange={(e) => updateRow(row.id, 'marks', e.target.value)}
                      aria-label="Marks"
                    />
                  </td>
                  <td className="grading-scheme-td">
                    <input
                      type="text"
                      className="grading-scheme-input"
                      placeholder="e.g. A+"
                      value={row.grade}
                      onChange={(e) => updateRow(row.id, 'grade', e.target.value)}
                      aria-label="Grade"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          className="grading-scheme-add-btn"
          onClick={addRow}
        >
          Add row
        </button>
      </div>
    </div>
  );
};

export default GradingScheme;
