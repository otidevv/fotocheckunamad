import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCanvas, loadImage } from "canvas";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
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

type EmployeeData = {
  id: string;
  email: string;
  dni: string;
  firstName: string;
  lastName: string;
  position: string;
  photoUrl: string | null;
  photoOriginal: string | null;
};

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

async function generateSide(
  employee: EmployeeData,
  config: TemplateConfig,
  side: "front" | "back"
): Promise<Buffer> {
  const canvas = createCanvas(config.cardWidth, config.cardHeight);
  const ctx = canvas.getContext("2d");

  const fieldValues: Record<string, string> = {
    fullName: `${employee.firstName} ${employee.lastName}`,
    position: employee.position,
    dni: `DNI: ${employee.dni}`,
    email: employee.email,
  };

  if (side === "front") {
    const tplPath = path.join(process.cwd(), "public", "templates", config.template);
    try {
      const tpl = await loadImage(tplPath);
      ctx.drawImage(tpl, 0, 0, config.cardWidth, config.cardHeight);
    } catch {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, config.cardWidth, config.cardHeight);
    }

    // Circular photo
    const photoSrc = employee.photoOriginal || employee.photoUrl;
    if (photoSrc) {
      try {
        const photoImg = await loadImage(path.join(process.cwd(), "public", photoSrc));
        const circle = config.front.photoCircle;
        ctx.save();
        ctx.beginPath();
        ctx.arc(circle.cx, circle.cy, circle.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Calculate "cover" dimensions to fill the entire circle
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

        ctx.drawImage(photoImg, drawX, drawY, drawW, drawH);
        ctx.restore();
      } catch { /* skip */ }
    }

    // Draw text fields with dynamic positioning
    let nextY = 0;
    const frontFields = Object.entries(config.front.fields);
    for (let i = 0; i < frontFields.length; i++) {
      const [key, f] = frontFields[i];
      const value = f.text || fieldValues[key];
      if (!value) continue;
      const w = f.fontWeight === "bold" ? "bold " : "";
      ctx.font = `${w}${f.fontSize}px Arial`;
      ctx.fillStyle = f.color;
      ctx.textAlign = "center";
      const textX = f.x === "center" ? config.cardWidth / 2 : Number(f.x);
      const currentY = nextY > f.y ? nextY : f.y;
      const lines = wrapText(ctx, value, f.maxWidth || config.cardWidth - 100);
      const lineHeight = f.fontSize * 1.3;
      for (let l = 0; l < lines.length; l++) {
        ctx.fillText(lines[l], textX, currentY + l * lineHeight);
      }
      nextY = currentY + lines.length * lineHeight + f.fontSize * 0.6;
    }
  } else {
    const tplPath = path.join(process.cwd(), "public", "templates", config.templateBack);
    try {
      const tpl = await loadImage(tplPath);
      ctx.drawImage(tpl, 0, 0, config.cardWidth, config.cardHeight);
    } catch {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, config.cardWidth, config.cardHeight);
      ctx.strokeStyle = "#4338ca";
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, config.cardWidth - 6, config.cardHeight - 6);
    }

    for (const [key, f] of Object.entries(config.back.fields)) {
      const value = f.text || fieldValues[key];
      if (!value) continue;
      const w = f.fontWeight === "bold" ? "bold " : "";
      ctx.font = `${w}${f.fontSize}px Arial`;
      ctx.fillStyle = f.color;
      ctx.textAlign = "center";
      ctx.fillText(value, f.x === "center" ? config.cardWidth / 2 : Number(f.x), f.y, f.maxWidth);
    }

    const qrData = JSON.stringify({ dni: employee.dni, name: `${employee.firstName} ${employee.lastName}`, position: employee.position });
    const qrDataUrl = await QRCode.toDataURL(qrData, { width: config.back.qr.size, margin: 1, color: { dark: "#1e1b4b", light: "#FFFFFF" } });
    const qrImg = await loadImage(qrDataUrl);
    const qrX = resolveX(config.back.qr.x, config.cardWidth, config.back.qr.size);
    ctx.drawImage(qrImg, qrX, config.back.qr.y, config.back.qr.size, config.back.qr.size);
  }

  return canvas.toBuffer("image/png");
}

export async function POST(req: NextRequest) {
  try {
    const { employeeIds } = await req.json();
    const ids = Array.isArray(employeeIds) ? employeeIds : [employeeIds];

    const employees = await prisma.employee.findMany({ where: { id: { in: ids } } });
    if (employees.length === 0) {
      return NextResponse.json({ error: "No se encontraron empleados" }, { status: 404 });
    }

    const configPath = path.join(process.cwd(), "public", "templates", "config.json");
    const config: TemplateConfig = JSON.parse(await fs.readFile(configPath, "utf-8"));

    const cardWidthMM = 54;
    const cardHeightMM = 86;

    // Each employee gets 2 pages: front + back (card-sized pages)
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [cardWidthMM, cardHeightMM] });

    for (let i = 0; i < employees.length; i++) {
      if (i > 0) doc.addPage([cardWidthMM, cardHeightMM]);

      // Front page
      const frontBuf = await generateSide(employees[i], config, "front");
      doc.addImage(`data:image/png;base64,${frontBuf.toString("base64")}`, "PNG", 0, 0, cardWidthMM, cardHeightMM);

      // Back page
      doc.addPage([cardWidthMM, cardHeightMM]);
      const backBuf = await generateSide(employees[i], config, "back");
      doc.addImage(`data:image/png;base64,${backBuf.toString("base64")}`, "PNG", 0, 0, cardWidthMM, cardHeightMM);
    }

    await prisma.employee.updateMany({ where: { id: { in: ids } }, data: { cardGenerated: true } });

    const filename = employees.length === 1
      ? `fotocheck-${employees[0].dni}.pdf`
      : `fotochecks-lote-${employees.length}.pdf`;

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 });
  }
}
