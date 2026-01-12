import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_DURATION = 15 * 60 * 1000; // 15 minutes

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null });
    }

    // Find session in database
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            division: true,
            isActive: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ user: null });
    }

    // Check if session expired
    if (new Date() > session.expiresAt) {
      // Delete expired session
      await prisma.session.delete({ where: { id: session.id } });
      return NextResponse.json({ user: null });
    }

    // Check if user is active
    if (!session.user.isActive) {
      return NextResponse.json({ user: null });
    }

    // Extend session on activity (sliding expiration)
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    });

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        division: session.user.division,
      },
    });
  } catch (error) {
    console.error("Session error:", error);
    return NextResponse.json({ user: null });
  }
}
