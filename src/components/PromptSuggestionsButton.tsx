interface PromptSuggestionsButtonProps {
  text: string;
  onClick: () => void;
}

export default function PromptSuggestionsButton({ text, onClick }: PromptSuggestionsButtonProps) {
  return (
    <button onClick={onClick} className="prompt-suggestion-btn">
      <span>{text}</span>
    </button>
  );
}
