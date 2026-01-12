"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";

interface IndexedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  indexedAt: string;
  status: string;
}

export default function IndexingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchFiles();
    }
  }, [user]);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/files");
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles?.length) return;

    setIsUploading(true);
    setUploadProgress(0);
    setMessage(null);

    const formData = new FormData();
    Array.from(selectedFiles).forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("/api/admin/files/upload", { method: "POST", body: formData });
      if (response.ok) {
        setMessage({ type: "success", text: "Fichiers indexes avec succes!" });
        fetchFiles();
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.message || "Erreur lors de l indexation" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de l upload" });
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Etes-vous sur de vouloir supprimer ce fichier?")) return;
    try {
      const response = await fetch("/api/admin/files/" + fileId, { method: "DELETE" });
      if (response.ok) {
        setMessage({ type: "success", text: "Fichier supprime" });
        fetchFiles();
      } else {
        setMessage({ type: "error", text: "Erreur lors de la suppression" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de la suppression" });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-heading font-bold text-primary-800">Indexation des documents</h1>
                <p className="text-primary-500 mt-1">Gerez les fichiers indexes pour la recherche</p>
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-cream-100 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Ajouter des fichiers
              </button>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt" onChange={handleUpload} className="hidden" />
            </div>

            {message && (
              <div className={`mb-6 p-4 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {message.text}
              </div>
            )}

            {isUploading && (
              <div className="mb-6 bg-white rounded-xl p-4 border border-cream-200">
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-cream-200 rounded-full h-2"><div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: uploadProgress + "%" }} /></div>
                  <span className="text-primary-600">{uploadProgress}%</span>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-4">{[...Array(3)].map((_, i) => (<div key={i} className="bg-white rounded-xl p-4 border border-cream-200 animate-pulse"><div className="h-6 bg-cream-300 rounded w-1/3" /></div>))}</div>
            ) : files.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-cream-200">
                <svg className="w-16 h-16 mx-auto text-primary-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <h3 className="text-lg font-semibold text-primary-800">Aucun fichier indexe</h3>
                <p className="text-primary-500 mt-2">Ajoutez des fichiers pour commencer l indexation</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-cream-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-cream-100"><tr><th className="px-4 py-3 text-left text-sm font-semibold text-primary-700">Nom</th><th className="px-4 py-3 text-left text-sm font-semibold text-primary-700">Taille</th><th className="px-4 py-3 text-left text-sm font-semibold text-primary-700">Date</th><th className="px-4 py-3 text-left text-sm font-semibold text-primary-700">Statut</th><th className="px-4 py-3 text-right text-sm font-semibold text-primary-700">Actions</th></tr></thead>
                  <tbody className="divide-y divide-cream-100">
                    {files.map((file) => (
                      <tr key={file.id} className="hover:bg-cream-50">
                        <td className="px-4 py-3"><div className="flex items-center gap-3"><svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><span className="font-medium text-primary-800">{file.name}</span></div></td>
                        <td className="px-4 py-3 text-primary-600">{formatSize(file.size)}</td>
                        <td className="px-4 py-3 text-primary-600">{new Date(file.indexedAt).toLocaleDateString("fr-FR")}</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">{file.status}</span></td>
                        <td className="px-4 py-3 text-right"><button onClick={() => handleDelete(file.id)} className="text-red-600 hover:text-red-800"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}