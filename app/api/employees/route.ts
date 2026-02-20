import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { employeeSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const cardGenerated = searchParams.get("cardGenerated") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const orderBy = searchParams.get("orderBy") || "newest";
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

  if (cardGenerated === "true") {
    where.cardGenerated = true;
  } else if (cardGenerated === "false") {
    where.cardGenerated = false;
  }

  if (dateFrom || dateTo) {
    const createdAtFilter: Record<string, Date> = {};
    if (dateFrom) {
      createdAtFilter.gte = new Date(dateFrom);
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      createdAtFilter.lte = end;
    }
    where.createdAt = createdAtFilter;
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: { createdAt: orderBy === "oldest" ? "asc" : "desc" },
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
