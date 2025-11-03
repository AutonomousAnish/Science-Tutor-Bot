import React, { useState, useEffect, useRef } from 'react';
import { Send, Sun, Moon, Zap, BookOpen, FlaskConical, Loader2 } from 'lucide-react';



// The chat application component
const App = () => {
  // State for messages, input, loading, dark mode, and feature
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);
  const chatAreaRef = useRef(null);
  const inputRef = useRef(null);

  // --- Initial Setup and Effects ---

  // Check system preference for initial theme and apply it
  useEffect(() => {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('theme');

    let initialDarkMode = false;
    if (storedTheme === 'dark' || (storedTheme === null && prefersDark)) {
      initialDarkMode = true;
    }
    setIsDarkMode(initialDarkMode);
    if (initialDarkMode) {
      document.body.classList.add('dark');
    }
  }, []);

  // Apply dark mode class to body whenever isDarkMode changes
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Initial welcome message effect
  useEffect(() => {
    // Only set initial message if the list is empty
    if (messages.length === 0) {
      setMessages([{
        id: 1,
        role: 'model', // Changed from 'bot' to 'model' for consistency with backend expectation
        content: "Welcome! I'm your science tutor. Ask me anything about the world around you! 💡",
        icon: <Zap size={16} className="text-green-500" />
      }]);
    }
    inputRef.current?.focus();
  }, []);

  // --- Core Functions ---

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const newUserMessage = { id: Date.now(), role: 'user', content: userMessage };

    // Update messages immediately with the user's message
    const newHistory = [...messages, newUserMessage];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    // --- Prepare History for Backend ---
    // The backend expects an array of objects like:
    // [{ role: 'user', parts: [{ text: '...' }] }, { role: 'model', parts: [{ text: '...' }] }]

    // Filter out the initial welcome message if it's not a conversational turn
    const conversationalHistory = newHistory.filter(msg => msg.role === 'user' || msg.role === 'model');

    const history_to_send = conversationalHistory.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    try {
      // NOTE: This is the critical API call to your Python backend
      const response = await fetch('https://science-bot-backend-api.onrender.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Pass the entire history array to the backend
          history: history_to_send,
        })
      });

      if (!response.ok) {
        // Log status if not ok, but throw to be caught below
        console.error('Backend returned status:', response.status);
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}. Message: ${errorData.error || 'Unknown backend error.'}`);
      }

      const data = await response.json();

      // FIX: Use data.response, which is what the Python backend sends
      const modelResponseText = data.response || "Sorry, I couldn't process that request.";

      const newBotMessage = {
        id: Date.now() + 1,
        role: 'model',
        content: modelResponseText,
        icon: <Zap size={16} className="text-green-500" />
      };

      setMessages(prev => [...prev, newBotMessage]);

    } catch (error) {
      console.error('Error fetching data from backend:', error);
      // Fallback message to user if the API call fails
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'model',
        content: `Error: Could not connect to the science tutor. Please ensure your Python backend is running on http://127.0.0.1:5000 and check the console for details. (Error: ${error.message})`,
        icon: <Zap size={16} className="text-red-500" />
      }]);
    } finally {
      setIsLoading(false);
      setActiveFeature(null);
      inputRef.current?.focus();
    }
  };

  const handleFeatureClick = (feature) => {
    // If the feature is already active, deactivate it.
    if (activeFeature === feature) {
      setActiveFeature(null);
      return;
    }
    setActiveFeature(feature);

    const featurePrompt = feature === 'summarize'
      ? "Enter the topic you want me to summarize."
      : "Enter the concept you want an experiment for.";

    // Temporarily set the input field to reflect the action
    setInput(featurePrompt);
    inputRef.current?.focus();
  };


  return (
    <div className="app-container">
      <div className="chat-card">
        {/* Header */}
        <div className="header">
          <div>
            <div className="header-title">Science-Tutor-Bot💡</div>
            <div className="header-subtitle">Your own personal Science Tutor</div>
          </div>
          <button onClick={toggleDarkMode} className="theme-toggle-button">
            {isDarkMode ? <Sun className="theme-toggle-icon" /> : <Moon className="theme-toggle-icon" />}
          </button>
        </div>

        {/* Chat Area */}
        <div ref={chatAreaRef} className="chat-area">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.role === 'user' ? 'message user-message' : 'message bot-message'}
            >
              {msg.role !== 'user' && msg.icon}
              <div className="message-content">{msg.content}</div>
              {/* <ReactMarkdown className="message-content">{msg.content} </ReactMarkdown> */}
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="message bot-message">
              <Loader2 size={16} className="animate-spin text-gray-400 mr-2" />
              Tutor-Bot is thinking...
            </div>
          )}
        </div>

        {/* Feature Bar */}
        <div className="feature-bar">
          <button
            onClick={() => handleFeatureClick('summarize')}
            className={`feature-button summarize-button ${activeFeature === 'summarize' ? 'active-feature' : ''}`}
          >
            <BookOpen size={18} className="mr-2" /> Summarize Topic
          </button>
          <button
            onClick={() => handleFeatureClick('experiment')}
            className={`feature-button experiment-button ${activeFeature === 'experiment' ? 'active-feature' : ''}`}
          >
            <FlaskConical size={18} className="mr-2" /> Suggest Experiment
          </button>
        </div>

        {/* Input Bar */}
        <div className="input-bar">
          <form onSubmit={sendMessage} className="input-form">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your science question..."
              className="text-input"
              rows={1}
            />
            <button type="submit" className="send-button" disabled={!input.trim() || isLoading}>
              <Send size={24} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App;
