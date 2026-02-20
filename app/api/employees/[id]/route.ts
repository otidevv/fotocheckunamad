import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { employeeSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }
  return NextResponse.json(employee);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { photoUrl, photoOriginal, ...rest } = body;
    const data = employeeSchema.parse(rest);

    const existing = await prisma.employee.findFirst({
      where: { dni: data.dni, NOT: { id } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe otro empleado con ese DNI" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { ...data };
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (photoOriginal !== undefined) updateData.photoOriginal = photoOriginal;

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(employee);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al actualizar empleado" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.employee.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
