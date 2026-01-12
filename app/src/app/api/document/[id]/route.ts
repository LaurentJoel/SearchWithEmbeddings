import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR || "/app/documents";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { id } = await params;

    // Decode the document ID (which is the file path)
    let decodedPath = decodeURIComponent(id);

    // Normalize paths from indexer (they come as /documents/... but files are in /app/documents/...)
    // Handle both /documents/... and /app/documents/... formats
    if (decodedPath.startsWith("/documents/")) {
      // Indexer returns /documents/... but actual path is /app/documents/...
      decodedPath = decodedPath.replace(/^\/documents\//, "/app/documents/");
    }

    // Build full path
    let fullPath: string;
    if (decodedPath.startsWith(DOCUMENTS_DIR)) {
      // Already an absolute path to documents dir
      fullPath = decodedPath;
    } else if (decodedPath.startsWith("/")) {
      // Absolute path but not in documents dir - try to use as relative
      fullPath = join(DOCUMENTS_DIR, decodedPath.substring(1));
    } else {
      fullPath = join(DOCUMENTS_DIR, decodedPath);
    }

    // Security: Ensure path is within allowed directory
    if (!fullPath.startsWith(DOCUMENTS_DIR)) {
      console.error("Path outside documents dir:", fullPath);
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    // For non-admin users, check division access
    if (user.role !== "ADMIN" && user.role !== "CENADI_DIRECTOR") {
      const userDivision = user.division?.toUpperCase();
      if (userDivision) {
        // Check if document is in user division folder
        const pathUpper = fullPath.toUpperCase();
        const hasAccess = pathUpper.includes("/" + userDivision + "/") ||
                          pathUpper.includes("\\" + userDivision + "\\");
        if (!hasAccess) {
          return NextResponse.json({ error: "Acces refuse a ce document" }, { status: 403 });
        }
      }
    }

    // Check if file exists
    try {
      await stat(fullPath);
    } catch {
      return NextResponse.json({ error: "Document non trouve" }, { status: 404 });
    }

    // Read the file
    const fileBuffer = await readFile(fullPath);

    // Determine content type
    const ext = fullPath.split(".").pop()?.toLowerCase();
    let contentType = "application/octet-stream";

    switch (ext) {
      case "pdf": contentType = "application/pdf"; break;
      case "doc": contentType = "application/msword"; break;
      case "docx": contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; break;
      case "xls": contentType = "application/vnd.ms-excel"; break;
      case "xlsx": contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; break;
      case "ppt": contentType = "application/vnd.ms-powerpoint"; break;
      case "pptx": contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation"; break;
      case "txt": contentType = "text/plain"; break;
      case "html": contentType = "text/html"; break;
      case "jpg": case "jpeg": contentType = "image/jpeg"; break;
      case "png": contentType = "image/png"; break;
      case "gif": contentType = "image/gif"; break;
    }

    // Log document view
    try {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          type: "DOCUMENT_VIEW",
          description: "Consultation: " + decodedPath.split("/").pop(),
          metadata: { path: decodedPath },
        },
      });
    } catch (logError) {
      console.error("Failed to log document view:", logError);
    }

    const fileName = decodedPath.split("/").pop() || "document";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline; filename=\"" + fileName + "\"",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Document fetch error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}