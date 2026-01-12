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

// GET /api/admin/activities/export - Export activities as CSV
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const activities = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: { name: true, email: true, division: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (format === "csv") {
      const headers = ["Date", "Utilisateur", "Email", "Division", "Role", "Type", "Description", "IP"];
      const rows = activities.map((a) => [
        a.createdAt.toISOString(),
        a.user.name || "N/A",
        a.user.email,
        a.user.division || "N/A",
        a.user.role,
        a.type,
        `"${a.description.replace(/"/g, '""')}"`,
        a.ipAddress || "N/A",
      ]);

      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="activities-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } else if (format === "json") {
      return new NextResponse(JSON.stringify(activities, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="activities-${new Date().toISOString().split("T")[0]}.json"`,
        },
      });
    }

    return NextResponse.json({ error: "Format non supporte" }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Erreur lors de l export" }, { status: 500 });
  }
}
