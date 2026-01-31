import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Curriculum from './Curriculum';
import StudentData from './StudentData';
import StudentsRecord from './StudentsRecord';
import StudentRecordDetail from './StudentRecordDetail';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Curriculum />} />
          <Route path="/students-data" element={<StudentData />} />
          <Route path="/record" element={<StudentsRecord />} />
          <Route path="/studentRecord/:courseCode" element={<StudentRecordDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
