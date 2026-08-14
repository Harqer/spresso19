import React from 'react';

interface ChatSuggestionChipProps {
  label: string;
  onClick: () => void;
}

export const ChatSuggestionChip: React.FC<ChatSuggestionChipProps> = ({ label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors"
    >
      {label}
    </button>
  );
};
