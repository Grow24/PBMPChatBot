import { useState, useEffect, useRef, ChangeEvent } from 'react'
import Bubble from './components/Bubble'
import PromptSuggestionsRow from './components/PromptSuggestionsRow'
import LoadingBubbles from './components/LoadingBubbles'
import AudioRecorder from './components/AudioRecorder'
import { sendMessage } from './services/chatService'

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  bookingFlow?: boolean;
  showDiagramPrompt?: boolean;
  diagramType?: 'personal' | 'professional';
  showDiagram?: boolean;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInBookingFlow, setIsInBookingFlow] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const noMessages = messages.length === 0

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current && !noMessages) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, noMessages])

  // Detect booking intent
  const detectBookingIntent = (text: string): boolean => {
    const BOOKING_KEYWORDS = ['book', 'meeting', 'schedule', 'demo', 'appointment', 'call', 'talk', 'speak'];
    const lowerText = text.toLowerCase();
    return BOOKING_KEYWORDS.some(keyword => lowerText.includes(keyword));
  }

  // Detect diagram request
  const detectDiagramRequest = (text: string): 'personal' | 'professional' | null => {
    const lowerText = text.toLowerCase();
    const diagramKeywords = ['show diagram', 'show me diagram', 'diagram', 'visual', 'flow chart', 'flowchart'];
    const hasDiagramRequest = diagramKeywords.some(kw => lowerText.includes(kw));
    
    if (hasDiagramRequest) {
      // Check if there's context from previous messages
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.diagramType);
      if (lastAssistantMsg?.diagramType) {
        return lastAssistantMsg.diagramType;
      }
      // Default to personal if ambiguous
      if (lowerText.includes('personal') || lowerText.includes('individual')) return 'personal';
      if (lowerText.includes('professional') || lowerText.includes('business') || lowerText.includes('corporate')) return 'professional';
      return 'personal'; // Default
    }
    return null;
  }

  const handlePrompt = async (promptText: string) => {
    if (promptText && promptText.trim() && !isLoading) {
      await handleSendMessage(promptText.trim());
    }
  }

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading || isInBookingFlow) return;

    // Check for diagram request first
    const diagramRequest = detectDiagramRequest(text);
    if (diagramRequest) {
      // Find the last assistant message that had a diagram prompt
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.diagramType);
      if (lastAssistantMsg) {
        // Show the diagram directly
        setMessages(prev => prev.map(msg => 
          msg.id === lastAssistantMsg.id 
            ? { ...msg, showDiagramPrompt: false, showDiagram: true }
            : msg
        ));
        return;
      }
    }

    // Check for booking intent
    if (detectBookingIntent(text)) {
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text
      };
      const bookingMsg: Message = {
        id: `booking-${Date.now()}`,
        role: 'assistant',
        content: "I'd be happy to help you schedule a meeting! Let me collect a few details.",
        bookingFlow: true
      };
      setMessages(prev => [...prev, userMsg, bookingMsg]);
      setIsInBookingFlow(true);
      return;
    }

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      // Send to API
      const response = await sendMessage([...messages, userMsg]);

      // Check if response contains diagram prompt marker
      const diagramPromptMatch = response.match(/\[DIAGRAM_PROMPT:(\w+)\]/);
      let cleanResponse = response;
      let diagramType: 'personal' | 'professional' | undefined = undefined;
      let showDiagramPrompt = false;

      if (diagramPromptMatch) {
        const detectedType = diagramPromptMatch[1].toLowerCase();
        if (detectedType === 'personal' || detectedType === 'professional') {
          diagramType = detectedType;
          showDiagramPrompt = true;
          // Remove the marker from the response
          cleanResponse = response.replace(/\[DIAGRAM_PROMPT:\w+\]/g, '').trim();
        }
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: cleanResponse,
        showDiagramPrompt,
        diagramType
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setError(null);
    setIsInBookingFlow(false);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = input.trim();
    if (textToSend) {
      handleSendMessage(textToSend);
      setInput('');
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }

  const handleAudioRecorded = async (transcribedText: string) => {
    if (!transcribedText.trim() || isLoading || isInBookingFlow) return;

    // Put transcribed text in input box for editing
    setInput(transcribedText);
  }

  const handleDiagramYes = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, showDiagramPrompt: false, showDiagram: true }
        : msg
    ));
  }

  const handleDiagramNo = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, showDiagramPrompt: false }
        : msg
    ));
  }

  const handleDiagramClose = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, showDiagram: false }
        : msg
    ));
  }

  return (
    <main>
      <div className="header-section">
        {noMessages ? (
          <img
            src="/pbmp-logo.svg"
            width={250}
            alt="PBMP Logo"
            className="logo-image"
          />
        ) : (
          <>
            <img
              src="/pbmp-logo.svg"
              width={120}
              alt="PBMP Logo"
              className="logo-image-small"
            />
            <div className="chat-header-info">
              <span className="chat-status-indicator"></span>
              <span className="chat-status-text">AI Assistant Active</span>
            </div>
            <button
              onClick={handleNewChat}
              className="new-chat-button"
              disabled={isLoading}
              aria-label="Start new chat"
            >
              <span>New Chat</span>
            </button>
          </>
        )}
      </div>

      <section className={noMessages ? "" : "populated"}>
        {noMessages ? (
          <>
            <div className="starter-text">
              <h2 className="starter-heading">
                Welcome to PBMP ChatBot
              </h2>
              <p className="starter-paragraph">
                Your Personal & Business Management Platform assistant from Grow24.ai. Ask me anything about PBMP and how it can help manage your personal and business needs efficiently.
              </p>
              <p className="starter-paragraph" style={{ marginTop: 12 }}>
                <a href="/voice">Open Hey PBMP voice POC</a>
                {' · '}
                <a href="/media">Open Media capture POC</a>
              </p>
            </div>
            <div style={{ width: '100%', marginTop: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
              <PromptSuggestionsRow onPromptClick={handlePrompt} />
            </div>
          </>
        ) : (
          <>
            <div className="messages-container">
              {messages.map((message) => (
                <Bubble
                  key={message.id}
                  message={message}
                  onBookingComplete={(data) => {
                    console.log('Booking completed:', data);
                    setIsInBookingFlow(false);
                  }}
                  onDiagramYes={handleDiagramYes}
                  onDiagramNo={handleDiagramNo}
                  onDiagramClose={handleDiagramClose}
                />
              ))}
              {isLoading && <LoadingBubbles />}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </section>

      <form onSubmit={handleSubmit}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <input
            className="question-box"
            onChange={handleInputChange}
            value={input}
            placeholder="Ask me anything about PBMP & Grow24.ai..."
            disabled={isLoading}
            style={{ paddingRight: '50px' }}
          />
          <AudioRecorder
            onAudioRecorded={handleAudioRecorded}
            disabled={isLoading || isInBookingFlow}
          />
        </div>
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? 'Sending...' : 'Send'}
        </button>
        {error && (
          <div style={{
            color: '#dc2626',
            marginTop: '10px',
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            ⚠️ Error: {error}
          </div>
        )}
      </form>
    </main>
  )
}

export default App
