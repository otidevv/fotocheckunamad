import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { employeeSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { dni: { contains: search } },
    ];
  }

  if (status) {
    where.status = status;
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.employee.count({ where }),
  ]);

  return NextResponse.json({
    employees,
    total,
    pages: Math.ceil(total / limit),
    page,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = employeeSchema.parse(body);

    const existing = await prisma.employee.findUnique({
      where: { dni: data.dni },
    });

    if (existing) {
      // Update existing employee instead of rejecting
      const updated = await prisma.employee.update({
        where: { id: existing.id },
        data: {
          ...data,
          cardGenerated: false,
        },
      });
      return NextResponse.json({ ...updated, existed: true }, { status: 200 });
    }

    const employee = await prisma.employee.create({ data });
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al crear empleado" }, { status: 500 });
  }
}
