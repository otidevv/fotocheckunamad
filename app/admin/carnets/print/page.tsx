"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Loader2, Printer, Search, Calendar,
} from "lucide-react";
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
  oficina: string;
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
  const [oficinaFilter, setOficinaFilter] = useState("all");
  const [oficinas, setOficinas] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [orderBy, setOrderBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (carnetFilter && carnetFilter !== "all") params.set("cardGenerated", carnetFilter === "generated" ? "true" : "false");
      if (oficinaFilter && oficinaFilter !== "all") params.set("oficina", oficinaFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("orderBy", orderBy);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/employees?${params}`);
      const data = await res.json();
      setEmployees(data.employees);
      setTotalPages(data.pages);
      setTotal(data.total);
      if (data.oficinas) setOficinas(data.oficinas);
    } catch {
      toast.error("Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, carnetFilter, oficinaFilter, dateFrom, dateTo, orderBy, page, limit]);

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

  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("ellipsis");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

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
        <CardContent className="p-4 space-y-3">
          {/* Row 1: Search + Status + Carnet */}
          <div className="flex flex-col sm:flex-row gap-3">
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
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={carnetFilter} onValueChange={(v) => { setCarnetFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Carnet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los carnets</SelectItem>
                <SelectItem value="generated">Generado</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Row 2: Oficina + Order */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={oficinaFilter} onValueChange={(v) => { setOficinaFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Oficina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las oficinas</SelectItem>
                {oficinas.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={orderBy} onValueChange={(v) => { setOrderBy(v); setPage(1); }}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Más recientes</SelectItem>
                <SelectItem value="oldest">Más antiguos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Row 3: Date range */}
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="w-[160px] h-9"
                />
                <span className="text-sm text-muted-foreground">a</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className="w-[160px] h-9"
                />
              </div>
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
              >
                Limpiar fechas
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected counter */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 px-1">
          <Badge variant="secondary" className="text-xs">
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </Badge>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelected(new Set())}>
            Deseleccionar todo
          </Button>
        </div>
      )}

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
                  <TableHead>Oficina</TableHead>
                  <TableHead>Carnet</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id} className={`cursor-pointer hover:bg-muted/50 transition-colors ${selected.has(emp.id) ? "bg-primary/5" : ""}`} onClick={() => toggleSelect(emp.id)}>
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
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{emp.position}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate">{emp.oficina}</TableCell>
                    <TableCell>
                      {emp.cardGenerated ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                          Generado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(emp.createdAt).toLocaleDateString("es-PE")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground whitespace-nowrap">
                  Mostrando {rangeStart}-{rangeEnd} de {total} empleado{total !== 1 ? "s" : ""}
                </p>
                <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / pág</SelectItem>
                    <SelectItem value="15">15 / pág</SelectItem>
                    <SelectItem value="25">25 / pág</SelectItem>
                    <SelectItem value="50">50 / pág</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page === 1} title="Primera página">
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} title="Anterior">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {pageNumbers.map((pn, i) =>
                    pn === "ellipsis" ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">...</span>
                    ) : (
                      <Button
                        key={pn}
                        variant={pn === page ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8 text-xs"
                        onClick={() => setPage(pn)}
                      >
                        {pn}
                      </Button>
                    )
                  )}
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} title="Siguiente">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={page === totalPages} title="Última página">
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
