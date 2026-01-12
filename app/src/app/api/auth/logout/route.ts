import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (sessionToken) {
      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: { user: true },
      });

      if (session) {
        const forwarded = request.headers.get("x-forwarded-for");
        const ipAddress = forwarded ? forwarded.split(",")[0] : "unknown";
        const userAgent = request.headers.get("user-agent") || "unknown";

        await prisma.activityLog.create({
          data: {
            userId: session.userId,
            type: "LOGOUT",
            description: `Deconnexion pour ${session.user.email}`,
            ipAddress,
            userAgent,
          },
        });

        await prisma.session.delete({
          where: { id: session.id },
        });
      }
    }

    cookieStore.delete("session");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    const cookieStore = await cookies();
    cookieStore.delete("session");
    return NextResponse.json({ success: true });
  }
}