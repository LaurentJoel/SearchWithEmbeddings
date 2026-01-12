import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR || "/app/documents";
const INDEXER_URL = process.env.INDEXER_URL || "http://indexer:8000";

// The indexer uses a different mount path for the same volume
// App: /app/documents -> Indexer: /documents
const INDEXER_DOCUMENTS_PATH = "/documents";

// Valid division codes
const VALID_DIVISIONS = ["DEP", "DEL", "DTB", "DIRE", "DAAF", "DSI", "DRH", "DAF", "DCOM", "DAJ", "DCOOP", "DG", "CENADI"];

// Get current user from session
async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  if (!sessionToken) return null;

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });

  if (!session || new Date() > session.expiresAt) return null;
  return session.user;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Non autorise", success: false },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Aucun fichier fourni", success: false },
        { status: 400 }
      );
    }

    // Determine division folder based on user role
    let division: string;
    if (user.role === "ADMIN" || user.role === "CENADI_DIRECTOR") {
      // Admin/Director can specify any division or use GENERAL
      const divisionParam = formData.get("division") as string | null;
      division = divisionParam && VALID_DIVISIONS.includes(divisionParam.toUpperCase())
        ? divisionParam.toUpperCase()
        : "GENERAL";
    } else {
      // Regular users and division heads use their own division
      division = user.division && VALID_DIVISIONS.includes(user.division)
        ? user.division
        : "UPLOADS";
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      // Check if file is a Blob-like object (works in Node.js)
      if (!file || typeof file === "string") continue;
      
      const fileObj = file as Blob & { name: string };
      if (!fileObj.name) continue;

      try {
        // Validate file type
        const allowedTypes = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".ppt", ".pptx"];
        const ext = fileObj.name.toLowerCase().substring(fileObj.name.lastIndexOf("."));

        if (!allowedTypes.includes(ext)) {
          errors.push({ name: fileObj.name, error: "Type de fichier non supporte: " + ext });
          continue;
        }

        // Validate file size (max 100MB)
        if (fileObj.size > 100 * 1024 * 1024) {
          errors.push({ name: fileObj.name, error: "Fichier trop volumineux (max 100 Mo)" });
          continue;
        }

        // Save file to division folder
        const bytes = await fileObj.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create division directory if needed
        const divisionDir = join(DOCUMENTS_DIR, division);
        await mkdir(divisionDir, { recursive: true });

        // Generate safe filename
        const timestamp = Date.now();
        const safeName = fileObj.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileName = timestamp + "_" + safeName;
        const filePath = join(divisionDir, fileName);

        await writeFile(filePath, buffer);

        // Trigger indexing - convert app path to indexer path
        // App uses /app/documents, Indexer uses /documents for the same volume
        const indexerFilePath = filePath.replace(DOCUMENTS_DIR, INDEXER_DOCUMENTS_PATH);
        
        try {
          const indexResponse = await fetch(INDEXER_URL + "/index/file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file_path: indexerFilePath, division: division }),
          });
          
          if (!indexResponse.ok) {
            console.error("Indexer returned error:", await indexResponse.text());
          }
        } catch (indexError) {
          console.log("Indexer will pick up file via watchdog:", indexError);
        }

        // Log activity
        try {
          await prisma.activityLog.create({
            data: {
              userId: user.id,
              type: "DOCUMENT_UPLOAD",
              description: "Upload: " + fileObj.name + " dans " + division,
              metadata: { fileName, division, size: fileObj.size },
            },
          });
        } catch (logError) {
          console.error("Failed to log upload:", logError);
        }

        results.push({
          name: fileObj.name,
          storedAs: fileName,
          size: fileObj.size,
          division: division,
          status: "success",
          message: "Fichier uploade, indexation en cours",
        });
      } catch (fileError) {
        console.error("Error processing file " + (file as any).name + ":", fileError);
        errors.push({ name: (file as any).name || "unknown", error: "Erreur lors de l enregistrement" });
      }
    }

    return NextResponse.json({
      success: results.length > 0,
      message: results.length + " fichier(s) uploade(s) dans " + division,
      files: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Echec de l upload", success: false },
      { status: 500 }
    );
  }
}