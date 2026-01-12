import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Helper to get current user from session
async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) return null;

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });

  if (!session || new Date() > session.expiresAt) {
    return null;
  }

  return session.user;
}

// GET - Fetch search history
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json([], { status: 401 });
    }

    // Fetch history from database for current user
    const history = await prisma.searchHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        query: true,
        mode: true,
        resultsCount: true,
        createdAt: true,
      },
    });

    // Transform to expected format
    const formattedHistory = history.map(item => ({
      id: item.id,
      query: item.query,
      results_count: item.resultsCount,
      search_mode: item.mode,
      created_at: item.createdAt.toISOString(),
    }));

    return NextResponse.json(formattedHistory);
  } catch (error) {
    console.error("History fetch error:", error);
    return NextResponse.json([]);
  }
}

// DELETE - Clear search history
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.searchHistory.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("History delete error:", error);
    return NextResponse.json(
      { error: "Failed to clear history" },
      { status: 500 }
    );
  }
}
