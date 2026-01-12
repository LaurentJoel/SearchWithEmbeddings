import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join, basename } from "path";

const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR || "/app/documents";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Decode the document ID (which is the file path)
    const decodedPath = decodeURIComponent(id);
    
    // Security: Ensure path is within allowed directory
    const fullPath = join(DOCUMENTS_DIR, decodedPath);
    
    if (!fullPath.startsWith(DOCUMENTS_DIR)) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Check if file exists
    try {
      await stat(fullPath);
    } catch {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = await readFile(fullPath);
    const fileName = basename(decodedPath);
    
    // Determine content type
    const ext = fullPath.split(".").pop()?.toLowerCase();
    let contentType = "application/octet-stream";
    
    switch (ext) {
      case "pdf":
        contentType = "application/pdf";
        break;
      case "docx":
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      case "xlsx":
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;
      case "pptx":
        contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        break;
      case "txt":
        contentType = "text/plain";
        break;
    }

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Document download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
