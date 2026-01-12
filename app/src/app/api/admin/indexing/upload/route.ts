import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { cookies } from "next/headers";

const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR || "/app/documents";
const INDEXER_URL = process.env.INDEXER_URL || "http://indexer:8000";

// Known division codes
const VALID_DIVISIONS = [
  "DG",      // Direction Générale
  "DEL",     // Direction des Études et de la Législation
  "DRH",     // Direction des Ressources Humaines
  "DAF",     // Direction Administrative et Financière
  "DSI",     // Direction des Systèmes d'Information
  "DCOM",    // Direction de la Communication
  "DAJ",     // Direction des Affaires Juridiques
  "DCOOP",   // Direction de la Coopération
  "UPLOADS", // Generic uploads (no division)
];

/**
 * POST /api/admin/indexing/upload
 * 
 * Upload files to the user's division folder.
 * The file watcher (watchdog) will automatically detect new files
 * and trigger indexing.
 * 
 * FormData fields:
 * - files: File[] - files to upload
 * - division: string (optional) - override division code
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files");
    const divisionOverride = formData.get("division") as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Get user's division from session (via cookie or header)
    // In production, this would come from the authenticated session
    const userDivision = divisionOverride || getUserDivision(request);
    
    // Validate division code
    const division = VALID_DIVISIONS.includes(userDivision.toUpperCase()) 
      ? userDivision.toUpperCase() 
      : "UPLOADS";

    const results = [];
    const errors = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      try {
        // Validate file type
        const allowedTypes = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"];
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
        
        if (!allowedTypes.includes(ext)) {
          errors.push({
            name: file.name,
            error: `Type de fichier non supporté: ${ext}`,
          });
          continue;
        }

        // Save file to division folder
        // Structure: /documents/{DIVISION}/{filename}
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create division directory if needed
        const divisionDir = join(DOCUMENTS_DIR, division);
        await mkdir(divisionDir, { recursive: true });

        // Generate unique filename to avoid collisions
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileName = `${timestamp}_${safeName}`;
        const filePath = join(divisionDir, fileName);
        
        await writeFile(filePath, buffer);

        // The file watcher (watchdog) will automatically detect this new file
        // and trigger indexing. No need to call the indexer API directly.
        // However, we can optionally trigger immediate indexing for faster response:
        
        let indexingStatus = "watchdog_pending";
        
        try {
          // Trigger immediate indexing (optional - watchdog will also catch it)
          const indexResponse = await fetch(`${INDEXER_URL}/index/file`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              file_path: filePath,
              division: division,
              user_id: getUserId(request),
            }),
          });
          
          if (indexResponse.ok) {
            indexingStatus = "indexing";
          }
        } catch (indexError) {
          // Watchdog will still catch the file, so this is not critical
          console.warn("Direct indexing call failed, watchdog will handle:", indexError);
          indexingStatus = "watchdog_pending";
        }

        results.push({
          name: file.name,
          storedAs: fileName,
          size: file.size,
          path: filePath,
          division: division,
          status: indexingStatus,
          message: indexingStatus === "indexing" 
            ? "Fichier en cours d'indexation"
            : "Fichier enregistré, indexation automatique en attente",
        });

      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        errors.push({
          name: file.name,
          error: "Erreur lors de l'enregistrement du fichier",
        });
      }
    }

    return NextResponse.json({
      success: results.length > 0,
      message: `${results.length} fichier(s) uploadé(s) dans le dossier ${division}`,
      files: results,
      errors: errors.length > 0 ? errors : undefined,
      watchdog_info: "Les nouveaux fichiers seront automatiquement détectés et indexés par le service de surveillance",
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Échec de l'upload" },
      { status: 500 }
    );
  }
}

/**
 * Extract user's division from request (session/token)
 */
function getUserDivision(request: NextRequest): string {
  // Check header first (set by middleware from session)
  const headerDivision = request.headers.get("x-user-division");
  if (headerDivision) return headerDivision;
  
  // Check query param (for testing)
  const url = new URL(request.url);
  const queryDivision = url.searchParams.get("division");
  if (queryDivision) return queryDivision;
  
  // Default to UPLOADS if no division found
  return "UPLOADS";
}

/**
 * Extract user ID from request
 */
function getUserId(request: NextRequest): string | undefined {
  const headerUserId = request.headers.get("x-user-id");
  if (headerUserId) return headerUserId;
  
  return undefined;
}
