import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  const where: Record<string, unknown> = {};
  if (dateFrom || dateTo) {
    const printedAtFilter: Record<string, Date> = {};
    if (dateFrom) printedAtFilter.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      printedAtFilter.lte = end;
    }
    where.printedAt = printedAtFilter;
  }

  const [totalEmployees, totalGenerated, totalPrinted, oficinas] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { cardGenerated: true } }),
    prisma.employee.count({ where: { cardPrinted: true, ...where } }),
    prisma.employee.groupBy({
      by: ["oficina"],
      where: { cardPrinted: true, ...where },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  const pendingPrint = totalGenerated - await prisma.employee.count({
    where: { cardGenerated: true, cardPrinted: true },
  });

  // Recent printed employees
  const recentPrinted = await prisma.employee.findMany({
    where: { cardPrinted: true, ...where },
    orderBy: { printedAt: "desc" },
    take: 50,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dni: true,
      oficina: true,
      position: true,
      printedAt: true,
    },
  });

  return NextResponse.json({
    totalEmployees,
    totalGenerated,
    totalPrinted,
    pendingPrint,
    byOficina: oficinas.map((o) => ({
      oficina: o.oficina || "Sin oficina",
      count: o._count.id,
    })),
    recentPrinted,
  });
}
