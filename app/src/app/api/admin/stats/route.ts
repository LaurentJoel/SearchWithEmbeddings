import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const INDEXER_URL = process.env.INDEXER_URL || "http://indexer:8000";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Helper to get current user from session
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

interface IndexerStatus {
  status: string;
  milvus_connected: boolean;
  collection_stats: {
    name: string;
    num_entities: number;
  };
  file_watcher_active: boolean;
}

export async function GET() {
  try {
    // Check if user is admin
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "CENADI_DIRECTOR")) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // Fetch stats from indexer
    let indexerStatus: IndexerStatus | null = null;
    let indexerOnline = false;
    let milvusConnected = false;
    let totalPages = 0;

    try {
      const response = await fetch(`${INDEXER_URL}/status`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        indexerStatus = await response.json();
        indexerOnline = indexerStatus?.status === "running";
        milvusConnected = indexerStatus?.milvus_connected || false;
        totalPages = indexerStatus?.collection_stats?.num_entities || 0;
      }
    } catch (e) {
      console.error("Indexer fetch error:", e);
    }

    // Get database stats
    let dbConnected = false;
    let userCount = 0;
    let searchesToday = 0;
    let searchesThisWeek = 0;
    let divisionCount = 0;
    let recentSearches: Array<{ query: string; createdAt: Date }> = [];
    let usersPerDivision: Array<{ division: string; count: number }> = [];
    let uploadsPerDivision: Array<{ division: string; count: number }> = [];
    let uploadsToday = 0;
    let uploadsThisWeek = 0;
    let totalUploads = 0;

    try {
      // Check DB connection
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;

      // Get user count
      userCount = await prisma.user.count({ where: { isActive: true } });

      // Get division count
      divisionCount = await prisma.division.count();

      // Get users per division
      const usersByDivision = await prisma.user.groupBy({
        by: ['division'],
        _count: { id: true },
        where: { isActive: true },
      });
      usersPerDivision = usersByDivision.map(item => ({
        division: item.division || "Non assigne",
        count: item._count.id,
      }));

      // Get searches today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      searchesToday = await prisma.searchHistory.count({
        where: { createdAt: { gte: today } },
      });

      // Get searches this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      searchesThisWeek = await prisma.searchHistory.count({
        where: { createdAt: { gte: weekAgo } },
      });

      // Get recent searches
      recentSearches = await prisma.searchHistory.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: { query: true, createdAt: true },
      });

      // Get upload stats from activity logs
      try {
        uploadsToday = await prisma.activityLog.count({
          where: { 
            type: "DOCUMENT_UPLOAD",
            createdAt: { gte: today } 
          },
        });

        uploadsThisWeek = await prisma.activityLog.count({
          where: { 
            type: "DOCUMENT_UPLOAD",
            createdAt: { gte: weekAgo } 
          },
        });

        totalUploads = await prisma.activityLog.count({
          where: { type: "DOCUMENT_UPLOAD" },
        });

        // Get uploads per division by joining with users
        const uploadsByUser = await prisma.activityLog.findMany({
          where: { type: "DOCUMENT_UPLOAD" },
          include: { user: { select: { division: true } } },
        });

        const divisionUploadCounts: Record<string, number> = {};
        for (const upload of uploadsByUser) {
          const division = upload.user.division || "GENERAL";
          divisionUploadCounts[division] = (divisionUploadCounts[division] || 0) + 1;
        }
        uploadsPerDivision = Object.entries(divisionUploadCounts).map(([division, count]) => ({
          division,
          count,
        }));
      } catch (e) {
        console.error("Upload stats error:", e);
      }
    } catch (e) {
      console.error("Database query error:", e);
    }

    // Estimate document count (unique files from pages)
    const estimatedDocuments = Math.ceil(totalPages / 10);

    const stats = {
      total_documents: estimatedDocuments,
      total_pages: totalPages,
      divisions: divisionCount || 5,
      searches_today: searchesToday,
      searches_this_week: searchesThisWeek,
      active_users: userCount,
      users_per_division: usersPerDivision,
      uploads_today: uploadsToday,
      uploads_this_week: uploadsThisWeek,
      total_uploads: totalUploads,
      uploads_per_division: uploadsPerDivision,
      index_status: indexerOnline ? "idle" : "error",
      indexer_online: indexerOnline,
      milvus_connected: milvusConnected,
      db_connected: dbConnected,
      file_watcher_active: indexerStatus?.file_watcher_active || false,
      recent_searches: recentSearches.map((s) => ({
        query: s.query,
        time: s.createdAt.toISOString(),
      })),
      last_updated: new Date().toISOString(),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Stats error:", error);

    return NextResponse.json({
      total_documents: 0,
      total_pages: 0,
      divisions: 0,
      searches_today: 0,
      searches_this_week: 0,
      active_users: 0,
      users_per_division: [],
      uploads_today: 0,
      uploads_this_week: 0,
      total_uploads: 0,
      uploads_per_division: [],
      index_status: "error",
      indexer_online: false,
      milvus_connected: false,
      db_connected: false,
      file_watcher_active: false,
      recent_searches: [],
      last_updated: new Date().toISOString(),
      error: "Failed to fetch stats",
    }, { status: 500 });
  }
}
