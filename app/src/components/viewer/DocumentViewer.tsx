"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";

// Initialize PDF.js worker from CDN
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
}

interface SearchResult {
  id: string;
  file_path: string;
  file_name: string;
  page_number: number;
  text_content?: string;
  text_snippet?: string;
  division: string;
  score: number;
}

interface DocumentViewerProps {
  result: SearchResult;
  query: string;
  onClose: () => void;
}

interface PageInfo {
  pageNumber: number;
  hasMatch: boolean;
}

export function DocumentViewer({ result, query, onClose }: DocumentViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(result.page_number);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  // Load PDF document
  useEffect(() => {
    let isMounted = true;
    let loadedPdf: pdfjs.PDFDocumentProxy | null = null;

    const loadPdf = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use file_path instead of id for document URL
        const pdfUrl = `/api/document/${encodeURIComponent(result.file_path)}`;
        console.log("Loading PDF from:", pdfUrl);
        
        const loadingTask = pdfjs.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        if (!isMounted) {
          pdf.destroy();
          return;
        }

        loadedPdf = pdf;
        setPdfDoc(pdf);

        // Find pages with matches
        const pageInfos: PageInfo[] = [];
        const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const text = textContent.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ")
            .toLowerCase();

          const hasMatch = searchTerms.some((term) => text.includes(term));
          pageInfos.push({ pageNumber: i, hasMatch });
        }

        if (isMounted) {
          setPages(pageInfos);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading PDF:", err);
        if (isMounted) {
          setError("Impossible de charger le document");
          setIsLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      loadedPdf?.destroy();
    };
  }, [result.file_path, query]);

  // Render a single page
  const renderPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDoc) return;

      const canvas = canvasRefs.current.get(pageNumber);
      if (!canvas) return;

      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: zoom * 1.5 });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext("2d");
        if (!context) return;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        // Highlight search terms
        if (query) {
          await highlightSearchTerms(page, viewport, context);
        }
      } catch (err) {
        console.error("Error rendering page:", err);
      }
    },
    [pdfDoc, zoom, query]
  );

  // Highlight search terms on the canvas
  const highlightSearchTerms = async (
    page: pdfjs.PDFPageProxy,
    viewport: pdfjs.PageViewport,
    context: CanvasRenderingContext2D
  ) => {
    const textContent = await page.getTextContent();
    const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

    context.fillStyle = "rgba(255, 255, 0, 0.4)";

    for (const item of textContent.items) {
      if (!("str" in item)) continue;

      const text = item.str.toLowerCase();
      const matches = searchTerms.some((term) => text.includes(term));

      if (matches && item.transform) {
        const [, , , , x, y] = item.transform;
        const { width, height } = item;

        // Transform coordinates
        const [tx, ty] = viewport.convertToViewportPoint(x, y);

        context.fillRect(
          tx,
          ty - height * zoom * 1.5,
          (width || 50) * zoom * 1.5,
          (height || 12) * zoom * 1.5
        );
      }
    }
  };

  // Render visible pages when document or zoom changes
  useEffect(() => {
    if (!pdfDoc || pages.length === 0) return;

    // Render all pages with matches, plus a few around current page
    const pagesToRender = new Set<number>();

    pages.forEach((p) => {
      if (p.hasMatch) pagesToRender.add(p.pageNumber);
    });

    // Also render current page and neighbors
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(pdfDoc.numPages, currentPage + 2); i++) {
      pagesToRender.add(i);
    }

    pagesToRender.forEach((pageNum) => renderPage(pageNum));
  }, [pdfDoc, pages, currentPage, zoom, renderPage]);

  // Scroll to result page
  useEffect(() => {
    if (!isLoading && containerRef.current) {
      const pageElement = containerRef.current.querySelector(
        `[data-page="${result.page_number}"]`
      );
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [isLoading, result.page_number]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowUp" && currentPage > 1) setCurrentPage((p) => p - 1);
      if (e.key === "ArrowDown" && pdfDoc && currentPage < pdfDoc.numPages) {
        setCurrentPage((p) => p + 1);
      }
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 3));
      if (e.key === "-") setZoom((z) => Math.max(z - 0.25, 0.5));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, pdfDoc, onClose]);

  // Get pages to display: matching pages + first page + last page
  const matchingPages = pages.filter((p) => p.hasMatch);
  
  // Always include first and last pages for context
  const pagesToShow = [...matchingPages];
  const firstPage = pages.find(p => p.pageNumber === 1);
  const lastPage = pages.length > 0 ? pages[pages.length - 1] : null;
  
  if (firstPage && !pagesToShow.some(p => p.pageNumber === 1)) {
    pagesToShow.unshift({ ...firstPage, hasMatch: false });
  }
  if (lastPage && lastPage.pageNumber > 1 && !pagesToShow.some(p => p.pageNumber === lastPage.pageNumber)) {
    pagesToShow.push({ ...lastPage, hasMatch: false });
  }
  
  // Sort pages by page number
  pagesToShow.sort((a, b) => a.pageNumber - b.pageNumber);

  return (
    <div className="fixed inset-0 z-50 bg-primary-900/80 flex">
      {/* Sidebar - Page Thumbnails */}
      <aside className="w-48 bg-primary-800 border-r border-primary-700 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-primary-700">
          <h3 className="text-sm font-semibold text-cream-100">
            Pages affichees
          </h3>
          <p className="text-xs text-cream-400 mt-1">
            {pagesToShow.length} page{pagesToShow.length > 1 ? "s" : ""} ({matchingPages.length} avec resultats)
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {pagesToShow.map((page) => (
            <button
              key={page.pageNumber}
              onClick={() => setCurrentPage(page.pageNumber)}
              className={`
                w-full p-2 rounded-lg text-left transition-all
                ${currentPage === page.pageNumber
                  ? "bg-accent-600 text-cream-100"
                  : "bg-primary-700 text-cream-300 hover:bg-primary-600"
                }
              `}
            >
              <span className="text-sm font-medium">Page {page.pageNumber}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Viewer */}
      <div className="flex-1 flex flex-col bg-cream-200">
        {/* Header */}
        <header className="h-14 bg-white border-b border-cream-300 px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-primary-800 truncate max-w-md">
              {result.file_name}
            </h2>
            <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full uppercase">
              {result.division}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-cream-100 rounded-lg p-1">
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                className="p-1.5 hover:bg-cream-200 rounded text-primary-600"
                title="Zoom arriere"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="px-2 text-sm text-primary-700 font-medium min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                className="p-1.5 hover:bg-cream-200 rounded text-primary-600"
                title="Zoom avant"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Download - Use file_path */}
            <a
              href={`/api/document/${encodeURIComponent(result.file_path)}/download`}
              download={result.file_name}
              className="p-2 hover:bg-cream-100 rounded-lg text-primary-600 transition-colors"
              title="Telecharger"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-cream-100 rounded-lg text-primary-600 transition-colors"
              title="Fermer (Echap)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Document Content */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block w-12 h-12 border-4 border-primary-300 border-t-primary-600 rounded-full animate-spin mb-4" />
                <p className="text-primary-600">Chargement du document...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-red-600">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-lg font-medium">{error}</p>
              </div>
            </div>
          ) : (
            pagesToShow.map((page) => (
              <div
                key={page.pageNumber}
                data-page={page.pageNumber}
                className="bg-white rounded-lg shadow-lg overflow-hidden"
              >
                {/* Page Header */}
                <div className="px-4 py-2 bg-cream-100 border-b border-cream-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-primary-700">
                    Page {page.pageNumber}
                    {page.pageNumber === 1 && " (Premiere)"}
                    {lastPage && page.pageNumber === lastPage.pageNumber && page.pageNumber !== 1 && " (Derniere)"}
                  </span>
                  {page.pageNumber === result.page_number && (
                    <span className="px-2 py-0.5 bg-accent-100 text-accent-700 text-xs rounded-full font-medium">
                      Resultat principal
                    </span>
                  )}
                </div>

                {/* Canvas */}
                <div className="p-4 flex justify-center bg-cream-50">
                  <canvas
                    ref={(el) => {
                      if (el) canvasRefs.current.set(page.pageNumber, el);
                    }}
                    className="max-w-full shadow-md"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
