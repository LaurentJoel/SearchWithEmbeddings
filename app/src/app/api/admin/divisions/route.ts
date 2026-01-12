import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

// GET /api/admin/divisions - List all divisions
export async function GET() {
  try {
    const divisions = await prisma.division.findMany({
      orderBy: { code: "asc" },
    });

    // Get user count per division
    const userCounts = await prisma.user.groupBy({
      by: ["division"],
      _count: { division: true },
      where: { isActive: true },
    });

    const userCountMap = Object.fromEntries(
      userCounts.map((uc) => [uc.division, uc._count.division])
    );

    const divisionsWithStats = divisions.map((div) => ({
      ...div,
      user_count: userCountMap[div.code] || 0,
    }));

    return NextResponse.json(divisionsWithStats);
  } catch (error) {
    console.error("Divisions fetch error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/admin/divisions - Create new division
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, description } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Code et nom requis" }, { status: 400 });
    }

    const existing = await prisma.division.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: "Ce code de division existe deja" }, { status: 400 });
    }

    const division = await prisma.division.create({
      data: { code, name, description: description || null },
    });

    return NextResponse.json(division, { status: 201 });
  } catch (error) {
    console.error("Division create error:", error);
    return NextResponse.json({ error: "Erreur lors de la creation" }, { status: 500 });
  }
}
