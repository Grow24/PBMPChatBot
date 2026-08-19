interface DiagramPromptProps {
  diagramType: 'personal' | 'professional';
  onYes: () => void;
  onNo: () => void;
}

const DiagramPrompt = ({ diagramType, onYes, onNo }: DiagramPromptProps) => {
  const cycleType = diagramType === 'personal' ? 'Personal' : 'Professional';
  
  return (
    <div className="diagram-prompt-container">
      <div className="diagram-prompt-content">
        <p className="diagram-prompt-text">
          Would you like to see a diagrammatic flow of the <strong>{cycleType} Management Cycle</strong>?
        </p>
        <div className="diagram-prompt-buttons">
          <button
            onClick={onYes}
            className="diagram-prompt-btn diagram-prompt-btn-yes"
          >
            Yes, show diagram
          </button>
          <button
            onClick={onNo}
            className="diagram-prompt-btn diagram-prompt-btn-no"
          >
            No, thanks
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiagramPrompt;
