interface DiagramViewerProps {
  type: 'personal' | 'professional';
  onClose?: () => void;
}

const DiagramViewer = ({ type, onClose }: DiagramViewerProps) => {
  const imagePath = type === 'personal' 
    ? '/pbmp_chatbot/PersonalSide.png'
    : '/pbmp_chatbot/ProfessionalSide.png';
  
  const title = type === 'personal'
    ? 'Personal Management Cycle'
    : 'Professional Management Cycle';

  return (
    <div className="diagram-container">
      <div className="diagram-header">
        <h3 className="diagram-title">{title}</h3>
        {onClose && (
          <button 
            onClick={onClose} 
            className="diagram-close-btn"
            aria-label="Close diagram"
          >
            ×
          </button>
        )}
      </div>
      <div className="diagram-image-wrapper">
        <img 
          src={imagePath} 
          alt={title}
          className="diagram-image"
        />
      </div>
    </div>
  );
};

export default DiagramViewer;
