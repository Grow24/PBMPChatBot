import { useState, useEffect, useRef } from 'react'
import Bubble from '../components/Bubble'
import PromptSuggestionsRow from '../components/PromptSuggestionsRow'
import LoadingBubbles from '../components/LoadingBubbles'
import AudioRecorder from '../components/AudioRecorder'
import { sendMessage } from '../services/chatService'

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  bookingFlow?: boolean;
  showDiagramPrompt?: boolean;
  diagramType?: 'personal' | 'professional';
  showDiagram?: boolean;
}

interface ChatWidgetProps {
  apiEndpoint?: string;
  position?: 'bottom-right' | 'bottom-left';
}

function ChatWidget({ apiEndpoint, position = 'bottom-right' }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInBookingFlow, setIsInBookingFlow] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<HTMLDivElement>(null)

  const noMessages = messages.length === 0

  // Update API endpoint if provided
  useEffect(() => {
    if (apiEndpoint) {
      // Store in window for chatService to access
      (window as any).PBMP_CHAT_API_ENDPOINT = apiEndpoint
    }
  }, [apiEndpoint])

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current && !noMessages && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, noMessages, isOpen])

  // Close widget when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        // Don't close if clicking the toggle button
        const target = event.target as HTMLElement
        if (!target.closest('.pbmp-chat-toggle')) {
          // Allow closing only if widget is open
          // Actually, let's keep it open - users can use the close button
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

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
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.diagramType);
      if (lastAssistantMsg?.diagramType) {
        return lastAssistantMsg.diagramType;
      }
      if (lowerText.includes('personal') || lowerText.includes('individual')) return 'personal';
      if (lowerText.includes('professional') || lowerText.includes('business') || lowerText.includes('corporate')) return 'professional';
      return 'personal';
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

    const diagramRequest = detectDiagramRequest(text);
    if (diagramRequest) {
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.diagramType);
      if (lastAssistantMsg) {
        setMessages(prev => prev.map(msg => 
          msg.id === lastAssistantMsg.id 
            ? { ...msg, showDiagramPrompt: false, showDiagram: true }
            : msg
        ));
        return;
      }
    }

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

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage([...messages, userMsg]);

      const diagramPromptMatch = response.match(/\[DIAGRAM_PROMPT:(\w+)\]/);
      let cleanResponse = response;
      let diagramType: 'personal' | 'professional' | undefined = undefined;
      let showDiagramPrompt = false;

      if (diagramPromptMatch) {
        const detectedType = diagramPromptMatch[1].toLowerCase();
        if (detectedType === 'personal' || detectedType === 'professional') {
          diagramType = detectedType;
          showDiagramPrompt = true;
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }

  const handleAudioRecorded = async (transcribedText: string) => {
    if (!transcribedText.trim() || isLoading || isInBookingFlow) return;
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

  const positionClass = position === 'bottom-left' ? 'pbmp-widget-bottom-left' : 'pbmp-widget-bottom-right'

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && (
        <button
          className="pbmp-chat-toggle"
          onClick={() => setIsOpen(true)}
          aria-label="Open PBMP Chat"
          style={{
            position: 'fixed',
            [position === 'bottom-left' ? 'left' : 'right']: '20px',
            bottom: '20px',
            width: '80px',
            height: '80px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            border: '4px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}>
            <img 
              src="/pbmp_chatbot/vite.svg" 
              alt="PBMP Chat" 
              style={{ 
                width: '50px', 
                height: '50px',
                display: 'block'
              }} 
            />
          </div>
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div
          ref={widgetRef}
          className={`pbmp-chat-widget ${positionClass}`}
          style={{
            position: 'fixed',
            [position === 'bottom-left' ? 'left' : 'right']: '20px',
            bottom: '20px',
            width: '380px',
            height: '600px',
            maxHeight: '90vh',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            overflow: 'hidden',
            border: '1px solid rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '16px 16px 0 0',
            borderBottom: '1px solid #e5e7eb',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '3px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'white',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
              }}>
                <img
                  src="/pbmp_chatbot/vite.svg"
                  width={28}
                  height={28}
                  alt="PBMP"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937', lineHeight: '1.2' }}>Grow24.ai</span>
                <span style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.2' }}>Personal & Business Management Platform</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6b7280',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
                aria-label="Close chat"
              >
                ×
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            WebkitOverflowScrolling: 'touch',
          }}>
            {noMessages ? (
              <>
                <div style={{
                  background: '#f3f4f6',
                  borderRadius: '12px',
                  padding: '24px 20px',
                  marginBottom: '16px',
                }}>
                  <h3 style={{ 
                    margin: '0 0 8px 0', 
                    color: '#1f2937', 
                    fontSize: '18px',
                    fontWeight: 600,
                  }}>
                    Welcome to PBMP ChatBot
                  </h3>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '13px',
                    color: '#6b7280',
                    lineHeight: '1.5',
                  }}>
                    Your Personal & Business Management Platform assistant. Ask me anything about PBMP and Grow24.ai.
                  </p>
                </div>
                <PromptSuggestionsRow onPromptClick={handlePrompt} />
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Input Area */}
          <div style={{
            padding: '12px',
            background: '#f3f4f6',
            borderTop: '1px solid #e5e7eb',
            borderRadius: '0 0 16px 16px',
          }}>
            <form
              onSubmit={handleSubmit}
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask me anything about PBMP & Grow24.ai..."
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '10px 50px 10px 16px',
                    background: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    outline: 'none',
                    color: '#1f2937',
                  }}
                />
                <AudioRecorder
                  onAudioRecorded={handleAudioRecorded}
                  disabled={isLoading || isInBookingFlow}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                style={{
                  padding: '10px 20px',
                  background: isLoading || !input.trim() 
                    ? '#f3f4f6' 
                    : '#9333ea',
                  border: 'none',
                  borderRadius: '12px',
                  color: isLoading || !input.trim() ? '#6b7280' : 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && input.trim()) {
                    e.currentTarget.style.background = '#7e22ce'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && input.trim()) {
                    e.currentTarget.style.background = '#9333ea'
                  }
                }}
              >
                {isLoading ? '...' : 'SEND'}
              </button>
            <button
              type="button"
              onClick={handleNewChat}
              style={{
                padding: '10px 16px',
                background: 'white',
                border: '1px solid #a7f3d0',
                borderRadius: '12px',
                color: '#059669',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0fdf4'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white'
              }}
            >
              New
            </button>
            </form>
          </div>

          {error && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              fontSize: '12px',
              borderTop: '1px solid rgba(239, 68, 68, 0.2)',
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default ChatWidget
