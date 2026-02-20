import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ dni: string }> }
) {
  const { dni } = await params;

  if (!/^\d{8}$/.test(dni)) {
    return NextResponse.json({ error: "DNI inválido" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://apidatos.unamad.edu.pe/api/consulta/${dni}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "No se encontró el DNI" },
        { status: 404 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Error al consultar el servicio" },
      { status: 500 }
    );
  }
}
