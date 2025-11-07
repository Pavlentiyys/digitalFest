
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Event from './pages/Event';
import FAQ from './pages/FAQ';
import Profile from './pages/Profile';
import Quiz from './pages/Events/Quiz';
import ARGame from './pages/Events/ARGame';
import ARImage from './pages/Events/ARImage';
import BottomNav from './components/BottomNav';

// Простая проверка, есть ли у пользователя группа.
// В реальном приложении это будет браться из API или хранилища.
const hasGroup = true; // Поменяйте на true, чтобы симулировать авторизованного пользователя

function App() {
  return (
    <div className="font-sans pb-16 md:pb-0">
      <main>
        <Routes>
          <Route path="/login" element={hasGroup ? <Navigate to="/event" /> : <Login />} />
          <Route path="/event" element={hasGroup ? <Event /> : <Navigate to="/login" />} />
          <Route path="/faq" element={hasGroup ? <FAQ /> : <Navigate to="/login" />} />
          <Route path="/profile" element={hasGroup ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/quiz" element={hasGroup ? <Quiz /> : <Navigate to="/login" />} />
          <Route path="/ar" element={hasGroup ? <ARGame /> : <Navigate to="/login" />} />
          <Route path="/ar-image" element={hasGroup ? <ARImage /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to={hasGroup ? "/event" : "/login"} />} />
        </Routes>
      </main>

      {hasGroup && <BottomNav />}
    </div>
  );
}

export default App;

