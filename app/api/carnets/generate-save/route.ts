import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCanvas, loadImage } from "canvas";
import QRCode from "qrcode";
import path from "path";
import fs from "fs/promises";

interface FieldConfig {
  x: string | number;
  y: number;
  fontSize: number;
  fontWeight?: string;
  color: string;
  maxWidth?: number;
  text?: string;
}

interface TemplateConfig {
  template: string;
  templateBack: string;
  cardWidth: number;
  cardHeight: number;
  front: {
    photoCircle: { cx: number; cy: number; radius: number };
    photo: { x: string | number; y: number; width: number; height: number };
    fields: Record<string, FieldConfig>;
  };
  back: {
    fields: Record<string, FieldConfig>;
    qr: { x: string | number; y: number; size: number };
  };
}

function resolveX(x: string | number, cardWidth: number, elWidth: number = 0): number {
  if (x === "center") return (cardWidth - elWidth) / 2;
  return Number(x);
}

function wrapText(ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + " " + words[i];
    if (ctx.measureText(testLine).width > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);
  return lines;
}

export async function POST(req: NextRequest) {
  try {
    const { employeeId } = await req.json();

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    const configPath = path.join(process.cwd(), "public", "templates", "config.json");
    const config: TemplateConfig = JSON.parse(await fs.readFile(configPath, "utf-8"));

    const carnetsDir = path.join(process.cwd(), "public", "uploads", "carnets");
    await fs.mkdir(carnetsDir, { recursive: true });

    const fieldValues: Record<string, string> = {
      fullName: `${employee.firstName} ${employee.lastName}`,
      position: employee.position,
      dni: `DNI: ${employee.dni}`,
      email: employee.email,
    };

    // === FRONT ===
    const frontCanvas = createCanvas(config.cardWidth, config.cardHeight);
    const fCtx = frontCanvas.getContext("2d");

    const tplPath = path.join(process.cwd(), "public", "templates", config.template);
    try {
      const tpl = await loadImage(tplPath);
      fCtx.drawImage(tpl, 0, 0, config.cardWidth, config.cardHeight);
    } catch {
      fCtx.fillStyle = "#FFFFFF";
      fCtx.fillRect(0, 0, config.cardWidth, config.cardHeight);
    }

    // Circular photo
    const photoSrc = employee.photoOriginal || employee.photoUrl;
    if (photoSrc) {
      try {
        const photoImg = await loadImage(path.join(process.cwd(), "public", photoSrc));
        const circle = config.front.photoCircle;
        fCtx.save();
        fCtx.beginPath();
        fCtx.arc(circle.cx, circle.cy, circle.radius, 0, Math.PI * 2);
        fCtx.closePath();
        fCtx.clip();

        const diameter = circle.radius * 2;
        const scaleX = diameter / photoImg.width;
        const scaleY = diameter / photoImg.height;
        const coverScale = Math.max(scaleX, scaleY);
        const drawW = photoImg.width * coverScale;
        const drawH = photoImg.height * coverScale;
        // Position to match CSS object-position: center 30%
        const drawX = circle.cx - drawW / 2;
        const overflow = drawH - diameter;
        const drawY = (circle.cy - circle.radius) - overflow * 0.15;

        fCtx.drawImage(photoImg, drawX, drawY, drawW, drawH);
        fCtx.restore();
      } catch { /* skip */ }
    }

    // Front text fields with dynamic positioning
    let nextY = 0;
    const frontFields = Object.entries(config.front.fields);
    for (let i = 0; i < frontFields.length; i++) {
      const [key, f] = frontFields[i];
      const value = f.text || fieldValues[key];
      if (!value) continue;
      const weight = f.fontWeight === "bold" ? "bold " : "";
      fCtx.font = `${weight}${f.fontSize}px Arial`;
      fCtx.fillStyle = f.color;
      fCtx.textAlign = "center";
      const textX = f.x === "center" ? config.cardWidth / 2 : Number(f.x);
      const currentY = nextY > f.y ? nextY : f.y;
      const lines = wrapText(fCtx, value, f.maxWidth || config.cardWidth - 100);
      const lineHeight = f.fontSize * 1.3;
      for (let l = 0; l < lines.length; l++) {
        fCtx.fillText(lines[l], textX, currentY + l * lineHeight);
      }
      nextY = currentY + lines.length * lineHeight + f.fontSize * 0.6;
    }

    const frontBuffer = frontCanvas.toBuffer("image/png");
    const frontFileName = `${employee.dni}-front.png`;
    await fs.writeFile(path.join(carnetsDir, frontFileName), frontBuffer);

    // === BACK ===
    const backCanvas = createCanvas(config.cardWidth, config.cardHeight);
    const bCtx = backCanvas.getContext("2d");

    const backTplPath = path.join(process.cwd(), "public", "templates", config.templateBack);
    try {
      const tpl = await loadImage(backTplPath);
      bCtx.drawImage(tpl, 0, 0, config.cardWidth, config.cardHeight);
    } catch {
      bCtx.fillStyle = "#FFFFFF";
      bCtx.fillRect(0, 0, config.cardWidth, config.cardHeight);
    }

    // Back text fields
    for (const [key, f] of Object.entries(config.back.fields)) {
      const value = f.text || fieldValues[key];
      if (!value) continue;
      const w = f.fontWeight === "bold" ? "bold " : "";
      bCtx.font = `${w}${f.fontSize}px Arial`;
      bCtx.fillStyle = f.color;
      bCtx.textAlign = "center";
      bCtx.fillText(value, f.x === "center" ? config.cardWidth / 2 : Number(f.x), f.y, f.maxWidth);
    }

    // QR code
    const qrData = JSON.stringify({
      dni: employee.dni,
      name: `${employee.firstName} ${employee.lastName}`,
      position: employee.position,
    });
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      width: config.back.qr.size,
      margin: 1,
      color: { dark: "#1e1b4b", light: "#FFFFFF" },
    });
    const qrImg = await loadImage(qrDataUrl);
    const qrX = resolveX(config.back.qr.x, config.cardWidth, config.back.qr.size);
    bCtx.drawImage(qrImg, qrX, config.back.qr.y, config.back.qr.size, config.back.qr.size);

    const backBuffer = backCanvas.toBuffer("image/png");
    const backFileName = `${employee.dni}-back.png`;
    await fs.writeFile(path.join(carnetsDir, backFileName), backBuffer);

    // Update employee with carnet URLs
    const carnetFrontUrl = `/uploads/carnets/${frontFileName}`;
    const carnetBackUrl = `/uploads/carnets/${backFileName}`;

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        carnetFrontUrl,
        carnetBackUrl,
        cardGenerated: true,
      },
    });

    return NextResponse.json({ carnetFrontUrl, carnetBackUrl });
  } catch (error) {
    console.error("Error generating and saving carnet:", error);
    return NextResponse.json({ error: "Error al generar carnet" }, { status: 500 });
  }
}
