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

  if (!session || new Date() > session.expiresAt) return null;

  return session.user;
}

// GET /api/admin/activities - List activities
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // Only admin can view all activities
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const type = searchParams.get("type");
    const userId = searchParams.get("userId");

    // Build where clause
    const where: any = {};
    if (type) where.type = type;
    if (userId) where.userId = userId;

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              division: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return NextResponse.json({
      activities,
      total,
      limit,
      offset,
      hasMore: offset + activities.length < total,
    });
  } catch (error) {
    console.error("Activities fetch error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des activites" },
      { status: 500 }
    );
  }
}

// POST /api/admin/activities - Log an activity
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const body = await request.json();
    const { type, description, metadata } = body;

    if (!type || !description) {
      return NextResponse.json(
        { error: "Type et description requis" },
        { status: 400 }
      );
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0] : "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const activity = await prisma.activityLog.create({
      data: {
        userId: user.id,
        type,
        description,
        metadata,
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({ activity });
  } catch (error) {
    console.error("Activity log error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l enregistrement de l activite" },
      { status: 500 }
    );
  }
}
