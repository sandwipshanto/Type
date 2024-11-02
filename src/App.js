import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TypingTest from './components/TypingTest';
import AdminPage from './components/AdminPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TypingTest />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}

export default App;
