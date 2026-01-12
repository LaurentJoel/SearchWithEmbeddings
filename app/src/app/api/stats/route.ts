import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INDEXER_URL = process.env.INDEXER_URL || "http://indexer:8000";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get counts from database
    const [userCount, divisionCount, searchCount] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.division.count(),
      prisma.searchHistory.count(),
    ]);

    // Get document count from indexer
    let documentCount = 0;
    try {
      const response = await fetch(`${INDEXER_URL}/stats`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        documentCount = data.total_pages || data.total_documents || 0;
      }
    } catch (e) {
      console.error("Failed to fetch indexer stats:", e);
    }

    return NextResponse.json({
      documents: documentCount,
      divisions: divisionCount || 6, // fallback to 6 default divisions
      users: userCount,
      searches: searchCount,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
