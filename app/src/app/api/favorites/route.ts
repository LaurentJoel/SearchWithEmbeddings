import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// For now, store favorites in memory (in production, use a Favorite model in database)
// This is a simplified implementation
let inMemoryFavorites: Array<{
  id: string;
  userId: string;
  documentId: string;
  fileName: string;
  filePath: string;
  division: string;
  addedAt: string;
}> = [];

// GET - Fetch favorites
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "anonymous";
    
    const userFavorites = inMemoryFavorites.filter(f => f.userId === userId);
    
    return NextResponse.json(userFavorites.map(f => ({
      id: f.id,
      document_id: f.documentId,
      file_name: f.fileName,
      file_path: f.filePath,
      division: f.division,
      added_at: f.addedAt,
    })));
  } catch (error) {
    console.error("Favorites fetch error:", error);
    return NextResponse.json([]);
  }
}

// POST - Add to favorites
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "anonymous";
    const body = await request.json();
    
    const { documentId, fileName, filePath, division } = body;
    
    if (!documentId || !fileName) {
      return NextResponse.json(
        { error: "Document ID and file name are required" },
        { status: 400 }
      );
    }
    
    // Check if already exists
    const exists = inMemoryFavorites.some(
      f => f.userId === userId && f.documentId === documentId
    );
    
    if (exists) {
      return NextResponse.json(
        { error: "Document already in favorites" },
        { status: 409 }
      );
    }
    
    const newFavorite = {
      id: `fav-${Date.now()}`,
      userId,
      documentId,
      fileName,
      filePath: filePath || "",
      division: division || "UNKNOWN",
      addedAt: new Date().toISOString(),
    };
    
    inMemoryFavorites.push(newFavorite);
    
    return NextResponse.json({
      success: true,
      favorite: {
        id: newFavorite.id,
        document_id: newFavorite.documentId,
        file_name: newFavorite.fileName,
        file_path: newFavorite.filePath,
        division: newFavorite.division,
        added_at: newFavorite.addedAt,
      },
    });
  } catch (error) {
    console.error("Add favorite error:", error);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}

// DELETE - Remove from favorites
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "anonymous";
    const { searchParams } = new URL(request.url);
    const favoriteId = searchParams.get("id");
    
    if (!favoriteId) {
      return NextResponse.json(
        { error: "Favorite ID is required" },
        { status: 400 }
      );
    }
    
    const index = inMemoryFavorites.findIndex(
      f => f.id === favoriteId && f.userId === userId
    );
    
    if (index === -1) {
      return NextResponse.json(
        { error: "Favorite not found" },
        { status: 404 }
      );
    }
    
    inMemoryFavorites.splice(index, 1);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove favorite error:", error);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}
