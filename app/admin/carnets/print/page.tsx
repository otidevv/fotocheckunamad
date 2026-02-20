"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Employee {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  position: string;
  photoUrl: string | null;
  status: string;
  cardGenerated: boolean;
  createdAt: string;
}

export default function PrintPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [carnetFilter, setCarnetFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [orderBy, setOrderBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (carnetFilter && carnetFilter !== "all") params.set("cardGenerated", carnetFilter === "generated" ? "true" : "false");
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("orderBy", orderBy);
      params.set("page", String(page));
      params.set("limit", "15");
      const res = await fetch(`/api/employees?${params}`);
      const data = await res.json();
      setEmployees(data.employees);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch {
      toast.error("Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, carnetFilter, dateFrom, dateTo, orderBy, page]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    setSelected(selected.size === employees.length ? new Set() : new Set(employees.map((e) => e.id)));
  };

  const handlePrint = async () => {
    if (selected.size === 0) { toast.error("Seleccione al menos un empleado"); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/carnets/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: Array.from(selected) }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fotochecks-lote.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`PDF generado con ${selected.size} fotochecks`);
    } catch {
      toast.error("Error al generar PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/carnets"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Impresión por Lotes</h1>
          <p className="text-sm text-muted-foreground">
            {total} empleado{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""} - Selecciona el personal para generar PDF
          </p>
        </div>
        <Button onClick={handlePrint} disabled={generating || selected.size === 0} className="gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          Generar PDF ({selected.size})
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o DNI..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="inactive">Inactivo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={carnetFilter} onValueChange={(v) => { setCarnetFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Carnet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los carnets</SelectItem>
              <SelectItem value="generated">Generado</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={orderBy} onValueChange={(v) => { setOrderBy(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Más recientes</SelectItem>
              <SelectItem value="oldest">Más antiguos</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">Desde</label>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-[150px]" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">Hasta</label>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-[150px]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="font-medium">No se encontraron empleados</p>
            <p className="text-sm mt-1">
              {search ? "Intenta con otra búsqueda" : "No hay empleados registrados"}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input type="checkbox" checked={selected.size === employees.length && employees.length > 0} onChange={toggleAll} className="rounded" />
                  </TableHead>
                  <TableHead className="w-14">Foto</TableHead>
                  <TableHead>Apellidos y Nombres</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Carnet</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id} className={`cursor-pointer ${selected.has(emp.id) ? "bg-primary/5" : ""}`} onClick={() => toggleSelect(emp.id)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleSelect(emp.id)} className="rounded" />
                    </TableCell>
                    <TableCell>
                      {emp.photoUrl ? (
                        <img src={emp.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{emp.lastName} {emp.firstName}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.dni}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{emp.position}</TableCell>
                    <TableCell>
                      {emp.cardGenerated ? (
                        <Badge variant="default">Generado</Badge>
                      ) : (
                        <Badge variant="secondary">Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(emp.createdAt).toLocaleDateString("es-PE")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
