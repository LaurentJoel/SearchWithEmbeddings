import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_DURATION = 15 * 60 * 1000; // 15 minutes

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null }, { status: 401 });
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
      // Invalid session - clear cookie
      cookieStore.delete("session");
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Check if session expired
    if (new Date() > session.expiresAt) {
      // Delete expired session
      await prisma.session.delete({ where: { id: session.id } });
      cookieStore.delete("session");
      return NextResponse.json({ user: null, expired: true }, { status: 401 });
    }

    // Check if user is active
    if (!session.user.isActive) {
      await prisma.session.delete({ where: { id: session.id } });
      cookieStore.delete("session");
      return NextResponse.json({ user: null }, { status: 403 });
    }

    // Extend session on activity (sliding expiration)
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    });

    // Update cookie expiry
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION / 1000,
      path: "/",
    });

    return NextResponse.json({ user: session.user });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
