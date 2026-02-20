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
    const { employeeId, side = "front" } = await req.json();

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    const configPath = path.join(process.cwd(), "public", "templates", "config.json");
    const config: TemplateConfig = JSON.parse(await fs.readFile(configPath, "utf-8"));

    const canvas = createCanvas(config.cardWidth, config.cardHeight);
    const ctx = canvas.getContext("2d");

    const fieldValues: Record<string, string> = {
      fullName: `${employee.firstName} ${employee.lastName}`,
      position: employee.position,
      dni: `DNI: ${employee.dni}`,
      email: employee.email,
    };

    if (side === "front") {
      // --- FRONT ---
      const templateFile = path.join(process.cwd(), "public", "templates", config.template);
      try {
        const tpl = await loadImage(templateFile);
        ctx.drawImage(tpl, 0, 0, config.cardWidth, config.cardHeight);
      } catch {
        // Fallback if no template
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, config.cardWidth, config.cardHeight);
        const grad = ctx.createLinearGradient(0, 0, config.cardWidth, 280);
        grad.addColorStop(0, "#1e1b4b");
        grad.addColorStop(1, "#4338ca");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, config.cardWidth, 280);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 60px Arial";
        ctx.textAlign = "center";
        ctx.fillText("UNIVERSIDAD NACIONAL AMAZÓNICA", config.cardWidth / 2, 120);
        ctx.fillText("DE MADRE DE DIOS", config.cardWidth / 2, 190);
        ctx.fillStyle = "#6366f1";
        ctx.fillRect(0, 280, config.cardWidth, 10);
      }

      // Draw photo CLIPPED in a CIRCLE
      const photoSrc = employee.photoOriginal || employee.photoUrl;
      if (photoSrc) {
        const photoPath = path.join(process.cwd(), "public", photoSrc);
        try {
          const photoImg = await loadImage(photoPath);
          const circle = config.front.photoCircle;

          ctx.save();

          // Create circular clipping path
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
        } catch {
          // Photo not found - draw placeholder circle
          const circle = config.front.photoCircle;
          ctx.fillStyle = "#E5E7EB";
          ctx.beginPath();
          ctx.arc(circle.cx, circle.cy, circle.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#9CA3AF";
          ctx.font = "40px Arial";
          ctx.textAlign = "center";
          ctx.fillText("SIN FOTO", circle.cx, circle.cy + 15);
        }
      }

      // Draw text fields with dynamic positioning (text wrapping pushes fields down)
      let nextY = 0;
      const frontFields = Object.entries(config.front.fields);
      for (let i = 0; i < frontFields.length; i++) {
        const [key, f] = frontFields[i];
        const value = f.text || fieldValues[key];
        if (!value) continue;
        const weight = f.fontWeight === "bold" ? "bold " : "";
        ctx.font = `${weight}${f.fontSize}px Arial`;
        ctx.fillStyle = f.color;
        ctx.textAlign = "center";
        const textX = f.x === "center" ? config.cardWidth / 2 : Number(f.x);
        const currentY = nextY > f.y ? nextY : f.y;
        const lines = wrapText(ctx, value, f.maxWidth || config.cardWidth - 100);
        const lineHeight = f.fontSize * 1.3;
        for (let l = 0; l < lines.length; l++) {
          ctx.fillText(lines[l], textX, currentY + l * lineHeight);
        }
        // Gap proportional to font size: more space after larger text
        nextY = currentY + lines.length * lineHeight + f.fontSize * 0.6;
      }
    } else {
      // --- BACK ---
      const templateBackFile = path.join(process.cwd(), "public", "templates", config.templateBack);
      try {
        const tpl = await loadImage(templateBackFile);
        ctx.drawImage(tpl, 0, 0, config.cardWidth, config.cardHeight);
      } catch {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, config.cardWidth, config.cardHeight);
        const grad = ctx.createLinearGradient(0, 0, config.cardWidth, 280);
        grad.addColorStop(0, "#1e1b4b");
        grad.addColorStop(1, "#4338ca");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, config.cardWidth, 280);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 70px Arial";
        ctx.textAlign = "center";
        ctx.fillText("UNAMAD", config.cardWidth / 2, 150);
        ctx.fillStyle = "#818cf8";
        ctx.font = "40px Arial";
        ctx.fillText("REVERSO", config.cardWidth / 2, 210);
        ctx.fillStyle = "#6366f1";
        ctx.fillRect(0, 280, config.cardWidth, 10);
        ctx.strokeStyle = "#4338ca";
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, config.cardWidth - 6, config.cardHeight - 6);
      }

      // Back text fields
      for (const [key, f] of Object.entries(config.back.fields)) {
        const value = f.text || fieldValues[key];
        if (!value) continue;
        const weight = f.fontWeight === "bold" ? "bold " : "";
        ctx.font = `${weight}${f.fontSize}px Arial`;
        ctx.fillStyle = f.color;
        ctx.textAlign = "center";
        const textX = f.x === "center" ? config.cardWidth / 2 : Number(f.x);
        ctx.fillText(value, textX, f.y, f.maxWidth);
      }

      // QR code
      const qrData = JSON.stringify({
        dni: employee.dni,
        name: `${employee.firstName} ${employee.lastName}`,
        position: employee.position,
        email: employee.email,
      });
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: config.back.qr.size,
        margin: 1,
        color: { dark: "#1e1b4b", light: "#FFFFFF" },
      });
      const qrImg = await loadImage(qrDataUrl);
      const qrX = resolveX(config.back.qr.x, config.cardWidth, config.back.qr.size);
      ctx.drawImage(qrImg, qrX, config.back.qr.y, config.back.qr.size, config.back.qr.size);
    }

    // Update status
    if (side === "front") {
      await prisma.employee.update({ where: { id: employeeId }, data: { cardGenerated: true } });
    }

    const pngBuffer = canvas.toBuffer("image/png");
    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="fotocheck-${employee.dni}-${side}.png"`,
      },
    });
  } catch (error) {
    console.error("Error generating carnet:", error);
    return NextResponse.json({ error: "Error al generar fotocheck" }, { status: 500 });
  }
}
