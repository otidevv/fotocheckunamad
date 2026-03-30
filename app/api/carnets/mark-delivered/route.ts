import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { employeeId, delivered } = await req.json();

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId requerido" }, { status: 400 });
    }

    const isDelivered = delivered !== false;

    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        cardDelivered: isDelivered,
        deliveredAt: isDelivered ? new Date() : null,
      },
    });

    return NextResponse.json({ ok: true, employee });
  } catch (error) {
    console.error("Error en mark-delivered:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
