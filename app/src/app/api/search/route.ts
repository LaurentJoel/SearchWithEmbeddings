import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const INDEXER_URL = process.env.INDEXER_URL || "http://indexer:8000";

interface SearchRequest {
  query: string;
  limit?: number;
  search_mode?: "hybrid" | "semantic" | "keyword";
  division?: string;
  file_type?: string;
}

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

// Track search in database
async function trackSearch(query: string, userId: string, resultCount: number, searchMode: string) {
  try {
    await prisma.searchHistory.create({
      data: {
        query: query.trim().toLowerCase(),
        userId: userId,
        resultsCount: resultCount,
        mode: searchMode,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        type: "SEARCH",
        description: "Recherche: " + query + " - " + resultCount + " resultats",
        metadata: { query, resultCount, searchMode },
      },
    });
  } catch (error) {
    console.error("Failed to track search:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();

    if (!body.query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Get user from session
    const user = await getCurrentUser();

    // Determine division filter based on user role
    let divisionFilter: string | undefined;
    
    if (user) {
      if (user.role === "ADMIN" || user.role === "CENADI_DIRECTOR") {
        // Admin and Director can search ALL divisions or specific one
        divisionFilter = body.division || undefined; // undefined = all divisions
      } else {
        // Regular users and division heads can ONLY see their division
        divisionFilter = user.division || undefined;
      }
    }

    // Forward request to Python indexer service
    const response = await fetch(INDEXER_URL + "/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: body.query,
        limit: body.limit || 50,
        search_mode: body.search_mode || "hybrid",
        division: divisionFilter,
        file_type: body.file_type,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Indexer error:", error);
      return NextResponse.json({ error: "Search service error" }, { status: response.status });
    }

    const data = await response.json();

    // Filter results by minimum score threshold to avoid irrelevant results
    const MIN_SCORE_THRESHOLD = 0.3; // Minimum similarity score (0-1 for cosine similarity)
    if (data.results) {
      data.results = data.results.filter((result: any) => {
        const score = result.score || 0;
        return score >= MIN_SCORE_THRESHOLD;
      });
    }

    // For non-admin users, filter results to only show their division
    if (user && user.role !== "ADMIN" && user.role !== "CENADI_DIRECTOR" && user.division) {
      const userDivision = user.division.toUpperCase();
      if (data.results) {
        data.results = data.results.filter((result: any) => {
          // Check if document path contains user division
          const docPath = result.file_path || result.path || "";
          return docPath.toUpperCase().includes("/" + userDivision + "/") || 
                 docPath.toUpperCase().startsWith(userDivision + "/") ||
                 (result.division && result.division.toUpperCase() === userDivision);
        });
      }
    }

    // Track search for analytics if user is logged in
    const resultCount = data.results?.length || 0;
    if (user) {
      trackSearch(body.query, user.id, resultCount, body.search_mode || "hybrid");
    }

    // Normalize response: ensure 'total' field exists for frontend
    return NextResponse.json({
      ...data,
      total: data.total_results || resultCount,
      total_results: data.total_results || resultCount,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}