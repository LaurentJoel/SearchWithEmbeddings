"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* 404 Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 
                      bg-cream-200 rounded-full mb-6">
          <svg 
            className="w-12 h-12 text-primary-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>
        
        {/* Title */}
        <h1 className="text-6xl font-bold text-primary-800 mb-4">404</h1>
        
        <h2 className="text-xl font-semibold text-primary-700 mb-3">
          Page non trouvée
        </h2>
        
        <p className="text-primary-500 mb-8">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link 
            href="/"
            className="btn btn-primary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Retour à l'accueil
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="btn btn-secondary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Page précédente
          </button>
        </div>
      </div>
    </div>
  );
}
