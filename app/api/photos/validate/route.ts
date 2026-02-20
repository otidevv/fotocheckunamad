import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Foto requerida" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer).metadata();

    const errors: string[] = [];

    // Validate dimensions
    if (!metadata.width || !metadata.height) {
      errors.push("No se pudo leer las dimensiones de la imagen");
    } else {
      if (metadata.width < 240 || metadata.height < 288) {
        errors.push("Dimensiones mínimas: 240×288px");
      }

      const ratio = metadata.width / metadata.height;
      const expectedRatio = 5 / 6;
      if (Math.abs(ratio - expectedRatio) > 0.1) {
        errors.push("La proporción debe ser aproximadamente 5:6");
      }
    }

    // Validate file size (2MB max)
    if (buffer.length > 2 * 1024 * 1024) {
      errors.push("El archivo no debe pesar más de 2MB");
    }

    // Validate format
    if (!["jpeg", "png", "jpg"].includes(metadata.format || "")) {
      errors.push("Solo se permiten formatos JPG o PNG");
    }

    return NextResponse.json({
      valid: errors.length === 0,
      errors,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: buffer.length,
      },
    });
  } catch (error) {
    console.error("Error validating photo:", error);
    return NextResponse.json(
      { error: "Error al validar la foto" },
      { status: 500 }
    );
  }
}
