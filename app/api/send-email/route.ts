import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsPDF } from "jspdf";
import nodemailer from "nodemailer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

export async function POST(req: NextRequest) {
  try {
    const { employeeId } = await req.json();

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    // Read already-generated carnet images and compress to JPEG
    const carnetsDir = path.join(process.cwd(), "public", "uploads", "carnets");
    const frontPath = path.join(carnetsDir, `${employee.dni}-front.png`);
    const backPath = path.join(carnetsDir, `${employee.dni}-back.png`);

    const [frontJpeg, backJpeg] = await Promise.all([
      sharp(frontPath).resize(810, 1290).jpeg({ quality: 80 }).toBuffer(),
      sharp(backPath).resize(810, 1290).jpeg({ quality: 80 }).toBuffer(),
    ]);

    // Build PDF from compressed JPEG images
    const cardWidthMM = 54;
    const cardHeightMM = 86;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [cardWidthMM, cardHeightMM] });

    doc.addImage(`data:image/jpeg;base64,${frontJpeg.toString("base64")}`, "JPEG", 0, 0, cardWidthMM, cardHeightMM);
    doc.addPage([cardWidthMM, cardHeightMM]);
    doc.addImage(`data:image/jpeg;base64,${backJpeg.toString("base64")}`, "JPEG", 0, 0, cardWidthMM, cardHeightMM);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // Send email
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const fullName = `${employee.firstName} ${employee.lastName}`;

    await transporter.sendMail({
      from: `"OTI UNAMAD" <${process.env.MAIL_FROM_ADDRESS}>`,
      to: employee.email,
      subject: `Fotocheck Digital - ${fullName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1e1b4b; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Universidad Nacional Amazónica de Madre de Dios</h2>
            <p style="margin: 5px 0 0; opacity: 0.8;">Oficina de Tecnologías de la Información</p>
          </div>
          <div style="padding: 30px 20px;">
            <p>Estimado(a) <strong>${fullName}</strong>,</p>
            <p>Su fotocheck digital ha sido generado exitosamente. Encontrará el archivo PDF adjunto a este correo.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">DNI:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${employee.dni}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Nombre:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${fullName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Cargo:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${employee.position}</td>
              </tr>
            </table>
            <p style="color: #666; font-size: 13px;">Este es un correo automático, por favor no responda a este mensaje.</p>
          </div>
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            UNAMAD - OTI &copy; 2026
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `fotocheck-${employee.dni}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return NextResponse.json({ success: true, message: "Correo enviado exitosamente" });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Error al enviar el correo" },
      { status: 500 }
    );
  }
}
