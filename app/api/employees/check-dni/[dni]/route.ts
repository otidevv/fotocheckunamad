import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ dni: string }> }
) {
  const { dni } = await params;

  const employee = await prisma.employee.findUnique({
    where: { dni },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      position: true,
      oficina: true,
      cardGenerated: true,
      cardPrinted: true,
      cardDelivered: true,
    },
  });

  if (!employee) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({ exists: true, employee });
}
