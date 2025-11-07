
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Event from './pages/Event';
import FAQ from './pages/FAQ';
import Profile from './pages/Profile';
import Quiz from './pages/Events/Quiz';
import ARGame from './pages/Events/ARGame';
import ARImage from './pages/Events/ARImage';
import QRQuest from './pages/QRQuest';
import TextChat from './pages/ai/TextChat';
import SpeechToText from './pages/ai/SpeechToText';
import TextToImage from './pages/ai/TextToImage';
import BottomNav from './components/BottomNav';
import { useAuth } from './context/AuthContext';

function App() {
  const { user } = useAuth();
  const isAuthed = !!user;
  return (
    <div className="font-sans pb-16 md:pb-0">
      <main>
        <Routes>
          <Route path="/login" element={isAuthed ? <Navigate to="/event" /> : <Login />} />
          <Route path="/" element={isAuthed ? <Event /> : <Navigate to="/login" />} />
          <Route path="/faq" element={isAuthed ? <FAQ /> : <Navigate to="/login" />} />
          <Route path="/profile" element={isAuthed ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/quiz" element={isAuthed ? (!user?.isQuiz ? <Quiz /> : <Navigate to="/event" />) : <Navigate to="/login" />} />
          <Route path="/ar" element={isAuthed ? (!user?.isAr ? <ARGame /> : <Navigate to="/event" />) : <Navigate to="/login" />} />
          <Route path="/ar-image" element={isAuthed ? (!user?.isAr ? <ARImage /> : <Navigate to="/event" />) : <Navigate to="/login" />} />
          <Route path="/qr" element={isAuthed ? <QRQuest /> : <Navigate to="/login" />} />
          {/* Randomized routes for AI demo pages */}
          <Route path="/x-chat-7k3h9" element={isAuthed ? (!user?.isTexted ? <TextChat /> : <Navigate to="/event" />) : <Navigate to="/login" />} />
          <Route path="/x-voice-2m1d8" element={isAuthed ? (!user?.isTranscribed ? <SpeechToText /> : <Navigate to="/event" />) : <Navigate to="/login" />} />
          <Route path="/x-image-9p4z2" element={isAuthed ? (!user?.isImageGeneration ? <TextToImage /> : <Navigate to="/event" />) : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to={isAuthed ? "/event" : "/login"} />} />
        </Routes>
      </main>

      {isAuthed && <BottomNav />}
    </div>
  );
}

export default App;

