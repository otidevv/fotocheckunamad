import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  const where: Record<string, unknown> = { cardPrinted: true };

  if (dateFrom || dateTo) {
    const printedAtFilter: Record<string, Date> = {};
    if (dateFrom) printedAtFilter.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      printedAtFilter.lte = end;
    }
    where.printedAt = printedAtFilter;
  }

  const employees = await prisma.employee.findMany({
    where,
    orderBy: { printedAt: "desc" },
    select: {
      dni: true,
      lastName: true,
      firstName: true,
      position: true,
      oficina: true,
      email: true,
      observations: true,
      printedAt: true,
      createdAt: true,
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Fotocheck UNAMAD";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Carnets Impresos");

  // Title row
  sheet.mergeCells("A1:I1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "REPORTE DE CARNETS IMPRESOS - UNAMAD 2026";
  titleCell.font = { size: 14, bold: true };
  titleCell.alignment = { horizontal: "center" };

  // Date range info
  sheet.mergeCells("A2:I2");
  const dateCell = sheet.getCell("A2");
  const rangeText = dateFrom || dateTo
    ? `Periodo: ${dateFrom || "inicio"} al ${dateTo || "actualidad"}`
    : "Todos los registros";
  dateCell.value = `${rangeText} | Total: ${employees.length} carnets impresos`;
  dateCell.font = { size: 10, italic: true, color: { argb: "FF666666" } };
  dateCell.alignment = { horizontal: "center" };

  // Empty row
  sheet.addRow([]);

  // Headers
  const headerRow = sheet.addRow([
    "N°", "DNI", "Apellidos", "Nombres", "Cargo", "Oficina", "Correo", "Fecha Impresión", "Observaciones",
  ]);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });
  headerRow.height = 25;

  // Data rows
  employees.forEach((emp, i) => {
    const row = sheet.addRow([
      i + 1,
      emp.dni,
      emp.lastName,
      emp.firstName,
      emp.position,
      emp.oficina,
      emp.email,
      emp.printedAt
        ? new Date(emp.printedAt).toLocaleDateString("es-PE")
        : "",
      emp.observations || "",
    ]);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
      cell.alignment = { vertical: "middle" };
    });
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      });
    }
  });

  // Column widths
  sheet.columns = [
    { width: 6 },   // N°
    { width: 12 },  // DNI
    { width: 22 },  // Apellidos
    { width: 22 },  // Nombres
    { width: 30 },  // Cargo
    { width: 30 },  // Oficina
    { width: 30 },  // Correo
    { width: 18 },  // Fecha
    { width: 30 },  // Observaciones
  ];

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="carnets-impresos-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
