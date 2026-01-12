"use client";

import { useState } from "react";

interface SearchResult {
  id: string;
  file_path: string;
  file_name: string;
  page_number: number;
  text_content: string;
  content?: string;
  division: string;
  score: number;
  highlighted_text?: string;
}

interface GroupedDocument {
  file_path: string;
  file_name: string;
  division: string;
  bestScore: number;
  pages: SearchResult[];
}

interface ResultsListProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onResultClick: (result: SearchResult) => void;
  selectedId?: string;
}

// Helper to group results by document
function groupResultsByDocument(results: SearchResult[]): GroupedDocument[] {
  const groups = new Map<string, GroupedDocument>();

  for (const result of results) {
    const key = result.file_path || result.file_name;
    
    if (!groups.has(key)) {
      groups.set(key, {
        file_path: result.file_path,
        file_name: result.file_name,
        division: result.division,
        bestScore: result.score,
        pages: [],
      });
    }

    const group = groups.get(key)!;
    group.pages.push(result);
    if (result.score > group.bestScore) {
      group.bestScore = result.score;
    }
  }

  // Sort groups by best score, then sort pages within each group
  return Array.from(groups.values())
    .sort((a, b) => b.bestScore - a.bestScore)
    .map((group) => ({
      ...group,
      pages: group.pages.sort((a, b) => a.page_number - b.page_number),
    }));
}

// Helper to highlight search terms in text
function highlightText(text: string, query: string): React.ReactNode {
  if (!text || !query?.trim()) return text || "";

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;

  const pattern = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(${pattern})`, "gi");

  const parts = text.split(regex);

  return parts.map((part, i) => {
    const isMatch = terms.some(term => part.toLowerCase() === term.toLowerCase());
    if (isMatch) {
      return (
        <mark key={i} className="bg-yellow-200 text-primary-800 px-0.5 rounded">
          {part}
        </mark>
      );
    }
    return part;
  });
}

// Get file type icon
function getFileIcon(fileName: string) {
  const ext = fileName?.split(".").pop()?.toLowerCase() || "";

  switch (ext) {
    case "pdf":
      return (
        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13M10.5,11A1.5,1.5 0 0,1 12,12.5A1.5,1.5 0 0,1 10.5,14A1.5,1.5 0 0,1 9,12.5A1.5,1.5 0 0,1 10.5,11M10.5,17A3.5,3.5 0 0,0 14,13.5A3.5,3.5 0 0,0 10.5,10A3.5,3.5 0 0,0 7,13.5A3.5,3.5 0 0,0 10.5,17Z" />
        </svg>
      );
    case "docx":
    case "doc":
      return (
        <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13M7,13H17V11H7V13M14,17H7V15H14V17Z" />
        </svg>
      );
    case "xlsx":
    case "xls":
      return (
        <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13M10,13V17H8V13H10M14,13V17H12V13H14M16,13V17H14V13H16Z" />
        </svg>
      );
    default:
      return (
        <svg className="w-8 h-8 text-primary-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13" />
        </svg>
      );
  }
}

// Get score color
function getScoreColor(score: number): string {
  const s = score || 0;
  if (s >= 0.8) return "bg-green-100 text-green-700 border-green-200";
  if (s >= 0.6) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-orange-100 text-orange-700 border-orange-200";
}

// Loading skeleton
function ResultSkeleton() {
  return (
    <div className="result-item animate-pulse">
      <div className="flex gap-4">
        <div className="w-12 h-12 bg-cream-300 rounded-lg" />
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-cream-300 rounded w-1/3" />
          <div className="h-4 bg-cream-200 rounded w-full" />
          <div className="h-4 bg-cream-200 rounded w-2/3" />
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-cream-300 rounded" />
            <div className="h-6 w-20 bg-cream-300 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Document Card Component
function DocumentCard({
  document,
  query,
  onResultClick,
  selectedId
}: {
  document: GroupedDocument;
  query: string;
  onResultClick: (result: SearchResult) => void;
  selectedId?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const firstPage = document.pages[0];
  const textContent = firstPage.text_content || firstPage.content || "";
  const displayText = textContent.length > 200 ? textContent.substring(0, 200) + "..." : textContent;

  return (
    <article className="bg-white rounded-xl border border-cream-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* Document Header */}
      <div
        className="p-4 cursor-pointer hover:bg-cream-50 transition-colors"
        onClick={() => onResultClick(firstPage)}
      >
        <div className="flex gap-4">
          {/* File Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-cream-100 rounded-lg flex items-center justify-center">
            {getFileIcon(document.file_name)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-lg font-semibold text-primary-800 mb-1 hover:text-primary-900 transition-colors">
              {document.file_name}
            </h3>

            {/* Text Preview */}
            <p className="text-primary-600 text-sm line-clamp-2 mb-3">
              {highlightText(displayText, query)}
            </p>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Division Badge */}
              <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full uppercase">
                {document.division}
              </span>

              {/* Pages Count */}
              <span className="px-2 py-1 bg-accent-100 text-accent-700 text-xs font-medium rounded-full">
                {document.pages.length} page{document.pages.length > 1 ? "s" : ""} trouvee{document.pages.length > 1 ? "s" : ""}
              </span>

              {/* Best Score */}
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getScoreColor(document.bestScore)}`}>
                {(document.bestScore * 100).toFixed(0)}% pertinent
              </span>
            </div>
          </div>

          {/* Expand Arrow */}
          <div className="flex-shrink-0 self-center">
            <svg
              className="w-5 h-5 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Pages List (if more than 1 page) */}
      {document.pages.length > 1 && (
        <>
          <div className="px-4 border-t border-cream-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="w-full py-2 flex items-center justify-between text-sm text-primary-500 hover:text-primary-700 transition-colors"
            >
              <span>Voir toutes les pages ({document.pages.length})</span>
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {isExpanded && (
            <div className="border-t border-cream-100 bg-cream-50 divide-y divide-cream-100">
              {document.pages.map((page) => {
                const pageText = page.text_content || page.content || "";
                const pagePreview = pageText.length > 150 ? pageText.substring(0, 150) + "..." : pageText;

                return (
                  <div
                    key={page.id}
                    onClick={() => onResultClick(page)}
                    className={`px-4 py-3 cursor-pointer hover:bg-cream-100 transition-colors ${
                      selectedId === page.id ? "bg-primary-50 border-l-2 border-primary-500" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-cream-200 rounded-lg flex items-center justify-center text-sm font-medium text-primary-700">
                        {page.page_number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-primary-600 line-clamp-2">
                          {highlightText(pagePreview, query)}
                        </p>
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getScoreColor(page.score)}`}>
                          {(page.score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </article>
  );
}

export function ResultsList({
  results,
  isLoading,
  query,
  onResultClick,
  selectedId
}: ResultsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <ResultSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Group results by document
  const groupedDocuments = groupResultsByDocument(results);

  return (
    <div className="space-y-4">
      {groupedDocuments.map((document, index) => (
        <DocumentCard
          key={document.file_path || index}
          document={document}
          query={query}
          onResultClick={onResultClick}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}
