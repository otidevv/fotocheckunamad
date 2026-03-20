import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { employeeIds, printed } = await req.json();

    if (!employeeIds || (!Array.isArray(employeeIds) && typeof employeeIds !== "string")) {
      return NextResponse.json({ error: "employeeIds requerido" }, { status: 400 });
    }

    const ids = Array.isArray(employeeIds) ? employeeIds : [employeeIds];
    const isPrinted = printed !== false;

    await prisma.employee.updateMany({
      where: { id: { in: ids } },
      data: {
        cardPrinted: isPrinted,
        printedAt: isPrinted ? new Date() : null,
      },
    });

    return NextResponse.json({ ok: true, count: ids.length });
  } catch (error) {
    console.error("Error en mark-printed:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
