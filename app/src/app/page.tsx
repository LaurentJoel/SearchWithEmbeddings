"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/search/SearchBox";
import { SearchFilters } from "@/components/search/SearchFilters";
import { ResultsList } from "@/components/search/ResultsList";
import { DocumentViewer } from "@/components/viewer/DocumentViewer";
import { FileUploadButton } from "@/components/upload/FileUploadButton";
import { useAuth } from "@/contexts/AuthContext";

interface SearchResult {
  id: string;
  file_path: string;
  file_name: string;
  page_number: number;
  text_content: string;
  division: string;
  score: number;
  highlighted_text?: string;
}

interface SearchFiltersState {
  division: string;
  dateFrom: string;
  dateTo: string;
  fileType: string;
  searchMode: "hybrid" | "semantic" | "keyword";
}

export default function HomePage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters, setFilters] = useState<SearchFiltersState>({
    division: "",
    dateFrom: "",
    dateTo: "",
    fileType: "",
    searchMode: "hybrid",
  });
  const [totalResults, setTotalResults] = useState(0);
  const [searchTime, setSearchTime] = useState(0);

  // Search function
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalResults(0);
      return;
    }

    setIsLoading(true);
    const startTime = performance.now();

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          limit: 50,
          search_mode: filters.searchMode,
          division: filters.division || undefined,
          file_type: filters.fileType || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la recherche");
      }

      const data = await response.json();
      setResults(data.results || []);
      setTotalResults(data.total || 0);
      setSearchTime(performance.now() - startTime);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        handleSearch(query);
      } else {
        // Clear results when query is empty
        setResults([]);
        setTotalResults(0);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  // Handle result selection
  const handleResultClick = (result: SearchResult) => {
    setSelectedResult(result);
  };

  // Close document viewer
  const handleCloseViewer = () => {
    setSelectedResult(null);
  };

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      {/* Header */}
      <Header 
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
        sidebarOpen={sidebarOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <main 
          id="main-content"
          className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? "ml-64" : "ml-0"
          }`}
        >
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Search Section */}
            <section className="mb-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-heading font-bold text-primary-800 mb-2">
                  Recherche Documentaire
                </h1>
                <p className="text-primary-600 max-w-2xl mx-auto">
                  Recherchez dans l'ensemble des documents avec la puissance de 
                  l'intelligence artificielle et de la recherche sémantique
                </p>
              </div>

              {/* Search Box and Upload Button Row */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-1">
                  <SearchBox 
                    value={query}
                    onChange={setQuery}
                    onSearch={() => handleSearch(query)}
                    isLoading={isLoading}
                  />
                </div>
                
                {/* Simple Upload Button for Users */}
                <FileUploadButton 
                  userDivision={user?.division || "UPLOADS"}
                  onUploadComplete={(files) => {
                    console.log("Files uploaded:", files);
                    // Optionally refresh search results
                  }}
                />
              </div>

              <SearchFilters 
                filters={filters}
                onChange={setFilters}
              />
            </section>

            {/* Results Section */}
            {(results.length > 0 || isLoading) && (
              <section>
                {/* Results Header */}
                {!isLoading && results.length > 0 && (
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-primary-600">
                      <span className="font-semibold text-primary-800">
                        {totalResults}
                      </span>{" "}
                      résultat{totalResults > 1 ? "s" : ""} trouvé{totalResults > 1 ? "s" : ""}
                      <span className="text-primary-400 ml-2">
                        ({(searchTime / 1000).toFixed(2)}s)
                      </span>
                    </p>
                    <div className="flex items-center gap-2 text-sm text-primary-500">
                      <span>Mode:</span>
                      <span className="px-2 py-1 bg-primary-100 rounded text-primary-700 font-medium">
                        {filters.searchMode === "hybrid" 
                          ? "Hybride" 
                          : filters.searchMode === "semantic" 
                            ? "Sémantique" 
                            : "Mots-clés"}
                      </span>
                    </div>
                  </div>
                )}

                <ResultsList 
                  results={results}
                  isLoading={isLoading}
                  query={query}
                  onResultClick={handleResultClick}
                  selectedId={selectedResult?.id}
                />
              </section>
            )}

            {/* Empty State */}
            {!isLoading && query && results.length === 0 && (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 
                              rounded-full bg-primary-100 text-primary-400 mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-primary-800 mb-2">
                  Aucun résultat trouvé
                </h3>
                <p className="text-primary-500 max-w-md mx-auto">
                  Essayez de modifier votre recherche ou d'utiliser des termes différents.
                  La recherche sémantique peut trouver des concepts similaires.
                </p>
              </div>
            )}

            {/* Welcome State */}
            {!query && (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 
                              rounded-full bg-gradient-to-br from-primary-100 to-primary-200 
                              text-primary-600 mb-6">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-heading font-bold text-primary-800 mb-3">
                  Commencez votre recherche
                </h2>
                <p className="text-primary-500 max-w-lg mx-auto mb-8">
                  Entrez un terme, une phrase ou une question. Notre système utilise 
                  l'intelligence artificielle pour comprendre le sens de votre recherche 
                  et trouver les documents les plus pertinents.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {["rapport annuel", "budget 2024", "procédure administrative"].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setQuery(suggestion)}
                      className="px-4 py-2 bg-cream-200 hover:bg-cream-300 
                               text-primary-700 rounded-lg transition-colors 
                               border border-cream-300"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Document Viewer Modal */}
      {selectedResult && (
        <DocumentViewer 
          result={selectedResult}
          query={query}
          onClose={handleCloseViewer}
        />
      )}
    </div>
  );
}
