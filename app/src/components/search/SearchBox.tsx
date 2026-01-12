"use client";

import { useRef, useEffect } from "react";

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

export function SearchBox({ value, onChange, onSearch, isLoading }: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
      <div className="relative group">
        {/* Search Icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 
                      group-focus-within:text-primary-600 transition-colors">
          {isLoading ? (
            <svg 
              className="w-5 h-5 animate-spin" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg 
              className="w-5 h-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          )}
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Rechercher des documents, rapports, procédures..."
          className="w-full h-14 pl-12 pr-32 text-lg bg-white border-2 border-cream-300
                   rounded-xl shadow-sm
                   placeholder:text-primary-300
                   focus:border-primary-500 focus:ring-4 focus:ring-primary-100
                   transition-all duration-200"
          aria-label="Recherche"
        />

        {/* Right Side Actions */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {/* Clear Button */}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-primary-400 hover:text-primary-600 
                       hover:bg-cream-200 rounded-lg transition-colors"
              aria-label="Effacer la recherche"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </button>
          )}

          {/* Keyboard Shortcut Hint */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 
                        bg-cream-200 rounded border border-cream-300">
            <kbd className="text-xs font-mono text-primary-500">Ctrl</kbd>
            <span className="text-primary-400">+</span>
            <kbd className="text-xs font-mono text-primary-500">K</kbd>
          </div>

          {/* Search Button */}
          <button
            type="submit"
            disabled={isLoading || !value.trim()}
            className="px-4 py-2 bg-primary-700 text-cream-100 rounded-lg
                     font-medium text-sm
                     hover:bg-primary-800 
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Rechercher
          </button>
        </div>
      </div>

      {/* Search Tips */}
      <div className="mt-3 text-center">
        <p className="text-sm text-primary-400">
          <span className="font-medium text-primary-500">Astuce:</span>{" "}
          Utilisez des phrases naturelles pour une recherche sémantique plus précise
        </p>
      </div>
    </form>
  );
}
