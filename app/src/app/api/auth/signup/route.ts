import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, division, role } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe sont requis" },
        { status: 400 }
      );
    }

    if (!division) {
      return NextResponse.json(
        { error: "La division est requise" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caracteres" },
        { status: 400 }
      );
    }

    // Validate role (don't allow ADMIN registration)
    const allowedRoles = ["USER", "DIVISION_HEAD", "CENADI_DIRECTOR"];
    if (role && !allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Role invalide" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte avec cet email existe deja" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || null,
        division: division,
        role: role || "USER",
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        division: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: "Compte cree avec succes",
      user,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    );
  }
}
