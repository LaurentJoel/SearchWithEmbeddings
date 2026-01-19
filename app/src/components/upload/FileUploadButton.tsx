"use client";

import { useState, useRef } from "react";

interface UploadResult {
  name: string;
  status: "success" | "error" | "uploading";
  message?: string;
}

interface FileUploadButtonProps {
  userDivision?: string;
  onUploadComplete?: (files: UploadResult[]) => void;
}

/**
 * Simple file upload button for regular users.
 * Files are uploaded to the user's division folder and automatically indexed.
 */
export function FileUploadButton({ 
  userDivision = "UPLOADS",
  onUploadComplete 
}: FileUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setShowDropdown(true);
    setUploadedFiles(
      Array.from(files).map((f) => ({
        name: f.name,
        status: "uploading" as const,
      }))
    );

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });
      formData.append("division", userDivision);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const successFiles: UploadResult[] = (result.files || []).map(
          (f: { name: string; message?: string }) => ({
            name: f.name,
            status: "success" as const,
            message: f.message || "Fichier uploadé et en cours d'indexation",
          })
        );
        
        const errorFiles: UploadResult[] = (result.errors || []).map(
          (f: { name: string; error?: string }) => ({
            name: f.name,
            status: "error" as const,
            message: f.error || "Erreur lors de l'upload",
          })
        );

        setUploadedFiles([...successFiles, ...errorFiles]);
        setShowSuccess(true);
        onUploadComplete?.([...successFiles, ...errorFiles]);

        // Auto-hide success after 5 seconds
        setTimeout(() => {
          setShowDropdown(false);
          setShowSuccess(false);
        }, 5000);
      } else {
        setUploadedFiles(
          Array.from(files).map((f) => ({
            name: f.name,
            status: "error" as const,
            message: result.error || "Erreur lors de l'upload",
          }))
        );
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadedFiles(
        Array.from(files).map((f) => ({
          name: f.name,
          status: "error" as const,
          message: "Erreur de connexion",
        }))
      );
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload button */}
      <button
        onClick={handleFileSelect}
        disabled={isUploading}
        className="inline-flex items-center gap-2 px-4 py-2.5 
                   bg-accent-600 hover:bg-accent-700 
                   text-white font-medium rounded-lg
                   transition-all duration-150
                   disabled:opacity-60 disabled:cursor-not-allowed
                   shadow-sm hover:shadow-md"
      >
        {isUploading ? (
          <>
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
            <span>Upload en cours...</span>
          </>
        ) : (
          <>
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <span>Ajouter un document</span>
          </>
        )}
      </button>

      {/* Upload results dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg 
                       border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-800">
                {isUploading ? "Upload en cours..." : "Upload terminé"}
              </h4>
              <button
                onClick={() => setShowDropdown(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Division: <span className="font-medium">{userDivision}</span>
            </p>
          </div>

          <ul className="max-h-60 overflow-y-auto">
            {uploadedFiles.map((file, index) => (
              <li
                key={index}
                className="px-4 py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-start gap-3">
                  {/* Status icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {file.status === "uploading" && (
                      <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {file.status === "success" && (
                      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {file.status === "error" && (
                      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {file.name}
                    </p>
                    {file.message && (
                      <p className={`text-xs mt-0.5 ${
                        file.status === "error" ? "text-red-500" : "text-gray-400"
                      }`}>
                        {file.message}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {showSuccess && (
            <div className="px-4 py-3 bg-green-50 text-green-700 text-sm">
              ✓ Les fichiers seront automatiquement indexés et disponibles dans quelques secondes.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
