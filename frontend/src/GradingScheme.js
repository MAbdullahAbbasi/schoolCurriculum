import React, { useState } from 'react';
import CurriculumHeader from './CurriculumHeader';
import './GradingScheme.css';

let nextId = 1;
const newRow = () => ({ id: nextId++, marks: '', grade: '' });

const GradingScheme = () => {
  const [rows, setRows] = useState([newRow()]);

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
