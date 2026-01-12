import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

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

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Non autorise" },
        { status: 401 }
      );
    }

    // Get user statistics from activity logs
    const [searches, uploads, views] = await Promise.all([
      prisma.activityLog.count({
        where: {
          userId: user.id,
          type: "SEARCH",
        },
      }),
      prisma.activityLog.count({
        where: {
          userId: user.id,
          type: "DOCUMENT_UPLOAD",
        },
      }),
      prisma.activityLog.count({
        where: {
          userId: user.id,
          type: "DOCUMENT_VIEW",
        },
      }),
    ]);

    return NextResponse.json({
      totalSearches: searches,
      totalUploads: uploads,
      totalDocumentsViewed: views,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des statistiques" },
      { status: 500 }
    );
  }
}
