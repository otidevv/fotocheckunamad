import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const existing = await prisma.adminUser.findUnique({ where: { username: "admin" } });
    if (existing) {
      return NextResponse.json({ message: "Admin ya existe" });
    }

    await prisma.adminUser.create({
      data: {
        username: "admin",
        password: "admin2026",
        name: "Administrador OTI",
      },
    });

    return NextResponse.json({ message: "Admin creado: admin / admin2026" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear admin" }, { status: 500 });
  }
}
