import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MeetingBooking, { LeadData } from './MeetingBooking';
import DiagramViewer from './DiagramViewer';
import DiagramPrompt from './DiagramPrompt';

interface BubbleProps {
  message: {
    content: string;
    role: 'user' | 'assistant';
    id?: string;
    bookingFlow?: boolean;
    showDiagramPrompt?: boolean;
    diagramType?: 'personal' | 'professional';
    showDiagram?: boolean;
  };
  onBookingComplete?: (data: LeadData) => void;
  onDiagramYes?: (messageId: string) => void;
  onDiagramNo?: (messageId: string) => void;
  onDiagramClose?: (messageId: string) => void;
}

const Bubble = ({ message, onBookingComplete, onDiagramYes, onDiagramNo, onDiagramClose }: BubbleProps) => {
  const { content, role, bookingFlow, showDiagramPrompt, diagramType, showDiagram } = message;

  if (!content && !bookingFlow && !showDiagram && !showDiagramPrompt) {
    return null;
  }

  return (
    <div 
      className={`${role} bubble`}
      style={{
        ...(role === 'user' ? {
          marginLeft: 'auto',
          marginRight: '16px',
          alignSelf: 'flex-end'
        } : {
          marginLeft: '16px',
          marginRight: 'auto',
          alignSelf: 'flex-start'
        })
      }}
    >
      {role === 'assistant' ? (
        bookingFlow ? (
          <MeetingBooking
            onComplete={(data) => {
              console.log('Booking completed:', data);
              if (onBookingComplete) {
                onBookingComplete(data);
              }
            }}
          />
        ) : showDiagram ? (
          <DiagramViewer 
            type={diagramType || 'personal'}
            onClose={onDiagramClose && message.id ? () => onDiagramClose(message.id!) : undefined}
          />
        ) : showDiagramPrompt ? (
          <div>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="markdown-p">{children}</p>,
                ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
                ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
                li: ({ children }) => <li className="markdown-li">{children}</li>,
                strong: ({ children }) => <strong className="markdown-strong">{children}</strong>,
                em: ({ children }) => <em className="markdown-em">{children}</em>,
                code: ({ children, className }) => {
                  const isInline = !className?.includes('language-');
                  return isInline ? (
                    <code className="markdown-code">{children}</code>
                  ) : (
                    <pre className="markdown-pre">
                      <code className={className || 'markdown-code-block'}>{children}</code>
                    </pre>
                  );
                },
                h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
                h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
                h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
              }}
            >
              {content}
            </ReactMarkdown>
            <DiagramPrompt
              diagramType={diagramType || 'personal'}
              onYes={() => {
                if (onDiagramYes && message.id) {
                  onDiagramYes(message.id);
                }
              }}
              onNo={() => {
                if (onDiagramNo && message.id) {
                  onDiagramNo(message.id);
                }
              }}
            />
          </div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="markdown-p">{children}</p>,
              ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
              ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
              li: ({ children }) => <li className="markdown-li">{children}</li>,
              strong: ({ children }) => <strong className="markdown-strong">{children}</strong>,
              em: ({ children }) => <em className="markdown-em">{children}</em>,
              code: ({ children, className }) => {
                const isInline = !className?.includes('language-');
                return isInline ? (
                  <code className="markdown-code">{children}</code>
                ) : (
                  <pre className="markdown-pre">
                    <code className={className || 'markdown-code-block'}>{children}</code>
                  </pre>
                );
              },
              h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
              h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
              h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
            }}
          >
            {content}
          </ReactMarkdown>
        )
      ) : (
        <div className="user-message-text">{content}</div>
      )}
    </div>
  );
};

export default Bubble;
