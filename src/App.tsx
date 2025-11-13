
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Event from './pages/Event';
import FAQ from './pages/FAQ';
import Profile from './pages/Profile';
import Quiz from './pages/Events/Quiz';
import ARImage from './pages/Events/ARImage';
import QRQuest from './pages/Events/QRQuest';
import TextChat from './pages/ai/TextChat';
import SpeechToText from './pages/ai/SpeechToText';
import TextToImage from './pages/ai/TextToImage';
import BottomNav from './components/BottomNav';
import { useAuth } from './context/AuthContext';
import ARGame from './pages/Events/ARGame';
import ARFact from './pages/Events/ARFact';
import Rating from './pages/Rating';

function App() {
  const { user } = useAuth();
  const isAuthed = !!user;
  const hasQuiz = !!user?.isQuiz;
  const hasAr = !!user?.isAr;
  const hasTexted = !!user?.isTexted;
  const hasTranscribed = !!user?.isTranscribed;
  const hasImageGen = !!user?.isImageGeneration;
  return (
    <div className="font-sans pb-16 md:pb-0">
      <main>
        <Routes>
          <Route path="/login" element={isAuthed ? <Navigate to="/" /> : <Login />} />
          <Route path="/" element={isAuthed ? <Event /> : <Navigate to="/login" />} />
          <Route path="/faq" element={isAuthed ? <FAQ /> : <Navigate to="/login" />} />
          <Route path="/profile" element={isAuthed ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/quiz" element={isAuthed ? (!hasQuiz ? <Quiz /> : <Navigate to="/" />) : <Navigate to="/login" />} />
          <Route path="/ar" element={isAuthed ? (!hasAr ? <ARGame /> : <Navigate to="/" />) : <Navigate to="/login" />} />
          <Route path="/ar-image" element={isAuthed ? (!hasAr ? <ARImage /> : <Navigate to="/" />) : <Navigate to="/login" />} />
          <Route path="/ar-fact/:coinId" element={isAuthed ? <ARFact /> : <Navigate to="/login" />} />
          <Route path="/qr" element={isAuthed ? <QRQuest /> : <Navigate to="/login" />} />
          <Route
            path="/rating"
            element={isAuthed ? <Rating /> : <Navigate to="/" />}
          />
          {/* Randomized routes for AI demo pages */}
          <Route path="/x-chat-7k3h9" element={isAuthed ? (!hasTexted ? <TextChat /> : <Navigate to="/" />) : <Navigate to="/login" />} />
          <Route path="/x-voice-2m1d8" element={isAuthed ? (!hasTranscribed ? <SpeechToText /> : <Navigate to="/" />) : <Navigate to="/login" />} />
          <Route path="/x-image-9p4z2" element={isAuthed ? (!hasImageGen ? <TextToImage /> : <Navigate to="/" />) : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to={isAuthed ? "/" : "/login"} />} />
        </Routes>
      </main>

      {isAuthed && <BottomNav />}
    </div>
  );
}

export default App;

