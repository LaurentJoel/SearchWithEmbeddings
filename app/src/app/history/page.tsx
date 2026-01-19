"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

interface SearchHistoryItem {
  id: string;
  query: string;
  results_count: number;
  search_mode: string;
  created_at: string;
}

export default function HistoryPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/history", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          setHistory(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const clearHistory = async () => {
    if (!confirm("Voulez-vous vraiment effacer tout l'historique?")) return;

    try {
      await fetch("/api/history", { method: "DELETE" });
      setHistory([]);
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-heading font-bold text-gray-800">
                  Historique des recherches
                </h1>
                <p className="text-gray-500 mt-1">
                  Retrouvez vos recherches précédentes
                </p>
              </div>

              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="btn btn-ghost text-accent-600 hover:text-accent-700
                            flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Effacer l'historique
                </button>
              )}
            </div>

            {/* History List */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />
                    <div className="h-4 bg-gray-100 rounded w-1/4" />
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16
                               rounded-full bg-gray-100 text-gray-400 mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Aucun historique
                </h3>
                <p className="text-gray-500">
                  Vos recherches apparaîtront ici après votre première recherche
                </p>
                <a href="/" className="btn btn-primary mt-4 inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Faire une recherche
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <a
                    key={item.id}
                    href={`/?q=${encodeURIComponent(item.query)}`}
                    className="block bg-white rounded-xl p-5 border border-gray-200
                              hover:border-primary-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Query */}
                        <h3 className="text-lg font-medium text-gray-800
                                     group-hover:text-gray-900 mb-2">
                          {item.query}
                        </h3>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="text-gray-500">
                            {item.results_count} résultat{item.results_count > 1 ? "s" : ""}
                          </span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span className="px-2 py-0.5 bg-primary-100 text-primary-600
                                         rounded-full text-xs font-medium">
                            {item.search_mode === "hybrid" 
                              ? "Hybride"
                              : item.search_mode === "semantic"
                                ? "Sémantique"
                                : "Mots-clés"}
                          </span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span className="text-gray-400">
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity
                                    text-gray-400 ml-4">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
