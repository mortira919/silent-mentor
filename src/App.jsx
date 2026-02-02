import { useState, useEffect } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { MessageInput } from './components/MessageInput';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSystemAudioCapture } from './hooks/useSystemAudioCapture';
import { askAI } from './services/gemini';
import './App.css';

const GEMINI_KEY_STORAGE = 'gemini_api_key';
const GROQ_KEY_STORAGE = 'groq_api_key';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [audioMode, setAudioMode] = useState('system'); // 'mic' or 'system'
  const [isPinned, setIsPinned] = useState(false);

  const micSpeech = useSpeechRecognition();
  const systemAudio = useSystemAudioCapture(groqKey);

  // Active audio source based on mode
  const activeAudio = audioMode === 'system' ? systemAudio : micSpeech;
  const isListening = audioMode === 'system' ? systemAudio.isCapturing : micSpeech.isListening;

  const isElectron = !!window.electronAPI;

  const togglePin = async () => {
    if (window.electronAPI) {
      const newState = !isPinned;
      await window.electronAPI.toggleAlwaysOnTop(newState);
      setIsPinned(newState);
    }
  };

  // Load API keys from localStorage
  useEffect(() => {
    const savedGemini = localStorage.getItem(GEMINI_KEY_STORAGE);
    const savedGroq = localStorage.getItem(GROQ_KEY_STORAGE);
    if (savedGemini) setGeminiKey(savedGemini);
    if (savedGroq) setGroqKey(savedGroq);
  }, []);

  // Update input with transcript
  useEffect(() => {
    if (activeAudio.fullTranscript) {
      setInputValue(activeAudio.fullTranscript);
    }
  }, [activeAudio.fullTranscript]);

  const handleToggleListening = () => {
    if (audioMode === 'system') {
      systemAudio.toggleCapture();
    } else {
      micSpeech.toggleListening();
    }
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputValue('');
    activeAudio.clearTranscript();
    setIsLoading(true);

    try {
      const response = await askAI(userMessage, geminiKey, groqKey);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Ошибка: ${err.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearInput = () => {
    setInputValue('');
    activeAudio.clearTranscript();
  };

  const handleSaveSettings = () => {
    localStorage.setItem(GEMINI_KEY_STORAGE, geminiKey);
    localStorage.setItem(GROQ_KEY_STORAGE, groqKey);
    setShowSettings(false);
  };

  return (
    <div className="app glass-card">
      {/* Header */}
      <header className="app-header">
        <div className="header-title">
          <span className="header-icon">🎙️</span>
          <h1>Interview Assistant</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isElectron && (
            <button
              className={`btn btn-ghost btn-icon ${isPinned ? 'active' : ''}`}
              onClick={togglePin}
              title={isPinned ? "Открепить" : "Закрепить поверх окон"}
              style={{ color: isPinned ? 'var(--accent-primary)' : 'inherit' }}
            >
              {isPinned ? '📌' : '📍'}
            </button>
          )}
          <button
            className="btn btn-ghost btn-icon settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Настройки"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel animate-fade-in">
          <div className="settings-content">
            <label className="settings-label">
              Gemini API Key (для ответов)
              <input
                type="password"
                className="input"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Gemini API ключ..."
              />
              <span className="settings-hint">
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                  Получить ключ
                </a>
              </span>
            </label>

            <label className="settings-label">
              Groq API Key (для системного звука)
              <input
                type="password"
                className="input"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="Groq API ключ..."
              />
              <span className="settings-hint">
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">
                  Получить ключ
                </a>
                {' '}— бесплатный, нужен для Whisper транскрипции
              </span>
            </label>

            <button className="btn btn-primary" onClick={handleSaveSettings}>
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Audio Mode Selector */}
      <div className="audio-mode-selector">
        <button
          className={`mode-btn ${audioMode === 'system' ? 'active' : ''}`}
          onClick={() => setAudioMode('system')}
          disabled={isListening}
        >
          🖥️ Системный звук
        </button>
        <button
          className={`mode-btn ${audioMode === 'mic' ? 'active' : ''}`}
          onClick={() => setAudioMode('mic')}
          disabled={isListening}
        >
          🎤 Микрофон
        </button>
      </div>

      {/* Error messages */}
      {(activeAudio.error || (audioMode === 'mic' && micSpeech.error)) && (
        <div className="error-banner animate-fade-in">
          ⚠️ {activeAudio.error || micSpeech.error}
        </div>
      )}

      {/* Status indicator */}
      {isListening && (
        <div className="status-bar animate-fade-in">
          <span className="recording-dot"></span>
          <span>
            {audioMode === 'system'
              ? (systemAudio.status === 'transcribing' ? 'Транскрибирую...' : 'Слушаю системный звук...')
              : 'Слушаю микрофон...'}
          </span>
        </div>
      )}

      {/* Chat */}
      <ChatWindow messages={messages} isLoading={isLoading} />

      {/* Input */}
      <MessageInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        onClear={handleClearInput}
        isListening={isListening}
        onToggleListening={handleToggleListening}
        isLoading={isLoading}
        audioMode={audioMode}
      />
    </div>
  );
}

export default App;
