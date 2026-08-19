import PromptSuggestionsButton from "./PromptSuggestionsButton"

interface PromptSuggestionsRowProps {
  onPromptClick: (prompt: string) => void;
}

const PromptSuggestionsRow = ({ onPromptClick }: PromptSuggestionsRowProps) => {
  const prompts = [
    "What is PBMP?",
    "How can PBMP help with business management?",
    "Tell me about personal management features",
    "Schedule a demo"
  ];
  
  return (
    <div className="prompt-suggestion-row">
      {prompts.map((prompt, index) => 
        <PromptSuggestionsButton
          key={`suggestions-${index}`}
          text={prompt}
          onClick={() => onPromptClick(prompt)}
        />
      )}
    </div>
  );
};

export default PromptSuggestionsRow;
