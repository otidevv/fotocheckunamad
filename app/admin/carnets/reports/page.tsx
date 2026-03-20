"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Users, Printer, FileCheck, Clock, Calendar, Building2, FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface ReportData {
  totalEmployees: number;
  totalGenerated: number;
  totalPrinted: number;
  pendingPrint: number;
  byOficina: { oficina: string; count: number }[];
  recentPrinted: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string;
    oficina: string;
    position: string;
    printedAt: string;
  }[];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/carnets/reports?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Error al cargar reporte");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/carnets/reports/export?${params}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carnets-impresos-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel descargado");
    } catch {
      toast.error("Error al exportar Excel");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const printPercentage = data.totalEmployees > 0
    ? Math.round((data.totalPrinted / data.totalEmployees) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/carnets">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Reporte de Impresiones</h1>
          <p className="text-sm text-muted-foreground">
            Estadísticas de carnets impresos - Periodo 2026
          </p>
        </div>
        <Button onClick={handleExportExcel} disabled={exporting} variant="outline" className="gap-2">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          Descargar Excel
        </Button>
      </div>

      {/* Date filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[160px] h-9"
                  placeholder="Desde"
                />
                <span className="text-sm text-muted-foreground">a</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[160px] h-9"
                  placeholder="Hasta"
                />
              </div>
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
              >
                Limpiar fechas
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Personal</p>
                <p className="text-2xl font-bold">{data.totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Carnets Generados</p>
                <p className="text-2xl font-bold">{data.totalGenerated}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
                <Printer className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Carnets Impresos</p>
                <p className="text-2xl font-bold">{data.totalPrinted}</p>
                <p className="text-xs text-muted-foreground">{printPercentage}% del total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendientes Imprimir</p>
                <p className="text-2xl font-bold">{data.pendingPrint}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Progreso de impresión</p>
            <p className="text-sm text-muted-foreground">{data.totalPrinted} / {data.totalEmployees}</p>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-600 rounded-full transition-all duration-500"
              style={{ width: `${printPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By oficina */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Impresos por Oficina
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.byOficina.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay carnets impresos aún
              </p>
            ) : (
              <div className="space-y-3">
                {data.byOficina.map((item) => (
                  <div key={item.oficina} className="flex items-center justify-between">
                    <span className="text-sm truncate flex-1 mr-3">{item.oficina}</span>
                    <Badge variant="secondary" className="shrink-0">
                      {item.count} impreso{item.count !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent printed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Últimos Impresos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentPrinted.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay carnets impresos aún
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Oficina</TableHead>
                    <TableHead>Fecha Impresión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentPrinted.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium text-sm">
                        {emp.lastName} {emp.firstName}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{emp.dni}</TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate">
                        {emp.oficina}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(emp.printedAt).toLocaleDateString("es-PE")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
