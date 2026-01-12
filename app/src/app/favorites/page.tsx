"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

interface Favorite {
  id: string;
  document_id: string;
  file_name: string;
  file_path: string;
  division: string;
  added_at: string;
}

export default function FavoritesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await fetch("/api/favorites", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          setFavorites(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to fetch favorites:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  const removeFavorite = async (id: string) => {
    try {
      const response = await fetch(`/api/favorites?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setFavorites(favorites.filter(f => f.id !== id));
      }
    } catch (error) {
      console.error("Failed to remove favorite:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'pdf':
        return <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13Z" /></svg>;
      case 'xlsx':
      case 'xls':
        return <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13Z" /></svg>;
      case 'docx':
      case 'doc':
        return <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13Z" /></svg>;
      default:
        return <svg className="w-8 h-8 text-primary-400" fill="currentColor" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13Z" /></svg>;
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-heading font-bold text-primary-800">
                Favoris
              </h1>
              <p className="text-primary-500 mt-1">
                Accédez rapidement à vos documents favoris
              </p>
            </div>

            {/* Favorites List */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 border border-cream-200 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-cream-300 rounded-lg" />
                      <div className="flex-1">
                        <div className="h-5 bg-cream-300 rounded w-1/2 mb-2" />
                        <div className="h-4 bg-cream-200 rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16
                               rounded-full bg-cream-200 text-primary-400 mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-primary-800 mb-2">
                  Aucun favori
                </h3>
                <p className="text-primary-500 max-w-sm mx-auto mb-4">
                  Ajoutez des documents à vos favoris pour y accéder plus rapidement
                </p>
                <a href="/" className="btn btn-primary inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Rechercher des documents
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {favorites.map((favorite) => (
                  <div
                    key={favorite.id}
                    className="bg-white rounded-xl p-5 border border-cream-200
                              hover:border-primary-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-12 h-12 bg-cream-100 rounded-lg
                                     flex items-center justify-center">
                        {getFileIcon(favorite.file_name)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-primary-800 mb-1 truncate">
                          {favorite.file_name}
                        </h3>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="px-2 py-0.5 bg-primary-100 text-primary-700
                                         rounded-full text-xs font-medium uppercase">
                            {favorite.division}
                          </span>
                          <span className="text-primary-400">
                            Ajouté le {formatDate(favorite.added_at)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={`/api/document/${encodeURIComponent(favorite.document_id)}`}
                          target="_blank"
                          className="p-2 hover:bg-cream-100 rounded-lg text-primary-500
                                    hover:text-primary-700 transition-colors"
                          title="Ouvrir"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </a>
                        <button
                          onClick={() => removeFavorite(favorite.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-primary-400
                                    hover:text-red-600 transition-colors"
                          title="Retirer des favoris"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
