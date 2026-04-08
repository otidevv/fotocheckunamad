"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search, PlusCircle, Eye, Pencil, Trash2, Download,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Loader2, Users, Image as ImageIcon, Calendar, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Employee {
  id: string;
  email: string;
  dni: string;
  firstName: string;
  lastName: string;
  position: string;
  oficina: string;
  photoUrl: string | null;
  photoOriginal: string | null;
  carnetFrontUrl: string | null;
  carnetBackUrl: string | null;
  year: number;
  status: string;
  cardGenerated: boolean;
  observations: string;
  isLocacion: boolean;
  createdAt: string;
}

export default function CarnetsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [carnetFilter, setCarnetFilter] = useState("all");
  const [oficinaFilter, setOficinaFilter] = useState("all");
  const [oficinas, setOficinas] = useState<string[]>([]);
  const [orderBy, setOrderBy] = useState("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; employee: Employee | null }>({ open: false, employee: null });
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; employee: Employee | null }>({ open: false, employee: null });

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (carnetFilter && carnetFilter !== "all") {
        params.set("cardGenerated", carnetFilter === "generated" ? "true" : "false");
      }
      if (oficinaFilter && oficinaFilter !== "all") params.set("oficina", oficinaFilter);
      params.set("orderBy", orderBy);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
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
  }, [search, statusFilter, carnetFilter, oficinaFilter, orderBy, dateFrom, dateTo, page, limit]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleDelete = async () => {
    if (!deleteDialog.employee) return;
    try {
      await fetch(`/api/employees/${deleteDialog.employee.id}`, { method: "DELETE" });
      toast.success("Empleado eliminado");
      setDeleteDialog({ open: false, employee: null });
      fetchEmployees();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const handleBulkGenerate = async () => {
    const ids = selected.size > 0 ? Array.from(selected) : employees.map((e) => e.id);
    if (ids.length === 0) return;

    setGeneratingBulk(true);
    try {
      const res = await fetch("/api/carnets/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: ids }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fotochecks-lote.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`PDF generado con ${ids.length} fotochecks`);
      fetchEmployees();
    } catch {
      toast.error("Error al generar en lote");
    } finally {
      setGeneratingBulk(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === employees.length ? new Set() : new Set(employees.map((e) => e.id)));
  };

  // Calculate range for "Mostrando X-Y de Z"
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  // Generate page numbers for pagination
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
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Personal Registrado</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} empleado{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""} - Periodo 2026
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleBulkGenerate} disabled={generatingBulk} variant="outline" className="gap-2">
            {generatingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {selected.size > 0 ? `PDF (${selected.size})` : "PDF Todos"}
          </Button>
          <Link href="/admin/carnets/new">
            <Button className="gap-2">
              <PlusCircle className="w-4 h-4" />
              Nuevo
            </Button>
          </Link>
        </div>
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
          {/* Row 2: Date range */}
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="w-[160px] h-9"
                  placeholder="Desde"
                />
                <span className="text-sm text-muted-foreground">a</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
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

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Users className="w-12 h-12 mb-3" />
            <p className="font-medium">No se encontraron empleados</p>
            <p className="text-sm mt-1">
              {search ? "Intenta con otra búsqueda" : "Registra el primer empleado"}
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
                  <TableHead>Nombres y Apellidos</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Oficina</TableHead>
                  <TableHead>Carnet</TableHead>
                  <TableHead className="w-36">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleSelect(emp.id)} className="rounded" />
                    </TableCell>
                    <TableCell>
                      {emp.photoUrl ? (
                        <img src={`${emp.photoUrl}${emp.photoUrl.includes('?') ? '&' : '?'}v=${emp.id}`} alt="" className="w-10 h-10 rounded-full object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">?</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.dni}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{emp.position}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{emp.oficina}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {emp.cardGenerated ? (
                          <Badge
                            className="cursor-pointer bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                            onClick={() => setPreviewDialog({ open: true, employee: emp })}
                          >
                            Generado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                            Pendiente
                          </Badge>
                        )}
                        {emp.isLocacion && (
                          <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 text-xs">
                            Locación
                          </Badge>
                        )}
                        {emp.observations && (
                          <span title={emp.observations}>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Ver carnet"
                          onClick={() => setPreviewDialog({ open: true, employee: emp })}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Link href={`/admin/carnets/generate/${emp.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Generar carnet">
                            <ImageIcon className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/carnets/edit/${emp.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          title="Eliminar"
                          onClick={() => setDeleteDialog({ open: true, employee: emp })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

      {/* Preview dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ open, employee: open ? previewDialog.employee : null })}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {previewDialog.employee?.firstName} {previewDialog.employee?.lastName}
            </DialogTitle>
            <DialogDescription>
              DNI: {previewDialog.employee?.dni} | {previewDialog.employee?.position} | {previewDialog.employee?.oficina}
            </DialogDescription>
          </DialogHeader>
          {previewDialog.employee && (
            <div className="space-y-4">
              {/* Photos row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Foto Original</p>
                  {previewDialog.employee.photoOriginal ? (
                    <a
                      href={previewDialog.employee.photoOriginal.split("?")[0]}
                      download={`foto-${previewDialog.employee.dni}.jpg`}
                      title="Click para descargar"
                    >
                      <img src={`${previewDialog.employee.photoOriginal}${previewDialog.employee.photoOriginal.includes('?') ? '&' : '?'}v=${Date.now()}`} alt="Original" className="rounded-lg border mx-auto max-h-48 object-contain cursor-pointer hover:opacity-80 transition-opacity" />
                    </a>
                  ) : (
                    <div className="h-32 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">Sin foto</div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Carnet Anverso</p>
                  {previewDialog.employee.carnetFrontUrl ? (
                    <img src={`${previewDialog.employee.carnetFrontUrl}${previewDialog.employee.carnetFrontUrl.includes('?') ? '&' : '?'}v=${Date.now()}`} alt="Anverso" className="rounded-lg border mx-auto max-h-48 object-contain" />
                  ) : (
                    <div className="h-32 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">No generado</div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Carnet Reverso</p>
                  {previewDialog.employee.carnetBackUrl ? (
                    <img src={`${previewDialog.employee.carnetBackUrl}${previewDialog.employee.carnetBackUrl.includes('?') ? '&' : '?'}v=${Date.now()}`} alt="Reverso" className="rounded-lg border mx-auto max-h-48 object-contain" />
                  ) : (
                    <div className="h-32 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">No generado</div>
                  )}
                </div>
              </div>
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm border-t pt-3">
                <div><span className="text-muted-foreground">Correo:</span> {previewDialog.employee.email}</div>
                <div><span className="text-muted-foreground">Oficina:</span> {previewDialog.employee.oficina}</div>
                <div><span className="text-muted-foreground">Periodo:</span> {previewDialog.employee.year}</div>
                <div><span className="text-muted-foreground">Registro:</span> {new Date(previewDialog.employee.createdAt).toLocaleDateString("es-PE")}</div>
                <div><span className="text-muted-foreground">Estado:</span> {previewDialog.employee.status === "active" ? "Activo" : "Inactivo"}</div>
                <div><span className="text-muted-foreground">Locación:</span> {previewDialog.employee.isLocacion ? "Sí" : "No"}</div>
              </div>
              {previewDialog.employee.observations && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 mt-2">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Observaciones
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">{previewDialog.employee.observations}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, employee: open ? deleteDialog.employee : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar empleado</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar a{" "}
              <strong>{deleteDialog.employee?.firstName} {deleteDialog.employee?.lastName}</strong>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, employee: null })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
