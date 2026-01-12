"use client";

import { useState } from "react";

interface SearchFiltersState {
  division: string;
  dateFrom: string;
  dateTo: string;
  fileType: string;
  searchMode: "hybrid" | "semantic" | "keyword";
}

interface SearchFiltersProps {
  filters: SearchFiltersState;
  onChange: (filters: SearchFiltersState) => void;
}

const divisions = [
  { value: "", label: "Toutes les divisions" },
  { value: "dsi", label: "DSI - Direction des Systèmes d'Information" },
  { value: "drh", label: "DRH - Direction des Ressources Humaines" },
  { value: "daf", label: "DAF - Direction Administrative et Financière" },
  { value: "dg", label: "DG - Direction Générale" },
  { value: "dc", label: "DC - Direction de la Communication" },
  { value: "dj", label: "DJ - Direction Juridique" },
  { value: "dp", label: "DP - Direction des Projets" },
  { value: "dq", label: "DQ - Direction Qualité" },
];

const fileTypes = [
  { value: "", label: "Tous les types" },
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "Word (DOCX)" },
  { value: "xlsx", label: "Excel (XLSX)" },
  { value: "pptx", label: "PowerPoint (PPTX)" },
  { value: "txt", label: "Texte (TXT)" },
];

const searchModes = [
  { 
    value: "hybrid" as const, 
    label: "Hybride", 
    description: "Combine sémantique et mots-clés",
    icon: (
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" 
      />
    ),
  },
  { 
    value: "semantic" as const, 
    label: "Sémantique", 
    description: "Recherche par le sens",
    icon: (
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
      />
    ),
  },
  { 
    value: "keyword" as const, 
    label: "Mots-clés", 
    description: "Correspondance exacte",
    icon: (
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" 
      />
    ),
  },
];

export function SearchFilters({ filters, onChange }: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = <K extends keyof SearchFiltersState>(
    key: K,
    value: SearchFiltersState[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = filters.division || filters.dateFrom || filters.dateTo || filters.fileType;

  const clearFilters = () => {
    onChange({
      division: "",
      dateFrom: "",
      dateTo: "",
      fileType: "",
      searchMode: filters.searchMode,
    });
  };

  return (
    <div className="max-w-3xl mx-auto mt-4">
      {/* Search Mode Toggle */}
      <div className="flex justify-center gap-2 mb-4">
        {searchModes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => updateFilter("searchMode", mode.value)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200
              ${filters.searchMode === mode.value
                ? "border-primary-600 bg-primary-50 text-primary-700"
                : "border-cream-300 bg-white text-primary-500 hover:border-primary-300"
              }
            `}
            title={mode.description}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mode.icon}
            </svg>
            <span className="text-sm font-medium">{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 mx-auto text-sm text-primary-500 
                 hover:text-primary-700 transition-colors"
      >
        <svg 
          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2}
            d="M19 9l-7 7-7-7" 
          />
        </svg>
        <span>Filtres avancés</span>
        {hasActiveFilters && (
          <span className="px-2 py-0.5 bg-accent-100 text-accent-700 rounded-full text-xs font-medium">
            Actifs
          </span>
        )}
      </button>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="mt-4 p-4 bg-white border border-cream-300 rounded-xl shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Division Filter */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Division
              </label>
              <select
                value={filters.division}
                onChange={(e) => updateFilter("division", e.target.value)}
                className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-lg
                         text-primary-700 text-sm
                         focus:border-primary-500 focus:ring-2 focus:ring-primary-100
                         transition-all"
              >
                {divisions.map((div) => (
                  <option key={div.value} value={div.value}>
                    {div.label}
                  </option>
                ))}
              </select>
            </div>

            {/* File Type Filter */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Type de fichier
              </label>
              <select
                value={filters.fileType}
                onChange={(e) => updateFilter("fileType", e.target.value)}
                className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-lg
                         text-primary-700 text-sm
                         focus:border-primary-500 focus:ring-2 focus:ring-primary-100
                         transition-all"
              >
                {fileTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Du
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter("dateFrom", e.target.value)}
                className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-lg
                         text-primary-700 text-sm
                         focus:border-primary-500 focus:ring-2 focus:ring-primary-100
                         transition-all"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Au
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter("dateTo", e.target.value)}
                className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-lg
                         text-primary-700 text-sm
                         focus:border-primary-500 focus:ring-2 focus:ring-primary-100
                         transition-all"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-cream-200 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-accent-600 hover:text-accent-700 
                         font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
                Effacer les filtres
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
