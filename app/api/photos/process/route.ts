import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    const dni = formData.get("dni") as string | null;

    if (!file || !dni) {
      return NextResponse.json(
        { error: "Foto y DNI son requeridos" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const photosDir = path.join(uploadsDir, "photos");
    const originalsDir = path.join(uploadsDir, "originals");

    await fs.mkdir(photosDir, { recursive: true });
    await fs.mkdir(originalsDir, { recursive: true });

    // Save original
    const originalPath = path.join(originalsDir, `${dni}.jpg`);
    await fs.writeFile(originalPath, buffer);

    // Process with Sharp: resize to 240x288, optimize
    const processedBuffer = await sharp(buffer)
      .resize(240, 288, { fit: "cover", position: "top" })
      .jpeg({ quality: 85 })
      .toBuffer();

    const processedPath = path.join(photosDir, `${dni}.jpg`);
    await fs.writeFile(processedPath, processedBuffer);

    const photoUrl = `/uploads/photos/${dni}.jpg`;
    const photoOriginal = `/uploads/originals/${dni}.jpg`;

    return NextResponse.json({ photoUrl, photoOriginal });
  } catch (error) {
    console.error("Error processing photo:", error);
    return NextResponse.json(
      { error: "Error al procesar la foto" },
      { status: 500 }
    );
  }
}
