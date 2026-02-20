"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search, PlusCircle, Eye, Pencil, Trash2, Download,
  ChevronLeft, ChevronRight, Loader2, Users, Image as ImageIcon,
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
  photoUrl: string | null;
  photoOriginal: string | null;
  carnetFrontUrl: string | null;
  carnetBackUrl: string | null;
  year: number;
  status: string;
  cardGenerated: boolean;
  createdAt: string;
}

export default function CarnetsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
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
  }, [search, statusFilter, page]);

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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="inactive">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

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
                  <TableHead>Carnet</TableHead>
                  <TableHead className="w-36">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleSelect(emp.id)} className="rounded" />
                    </TableCell>
                    <TableCell>
                      {emp.photoUrl ? (
                        <img src={emp.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">?</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.dni}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{emp.position}</TableCell>
                    <TableCell>
                      {emp.cardGenerated ? (
                        <Badge variant="default" className="cursor-pointer" onClick={() => setPreviewDialog({ open: true, employee: emp })}>
                          Generado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pendiente</Badge>
                      )}
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

      {/* Preview dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ open, employee: open ? previewDialog.employee : null })}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {previewDialog.employee?.firstName} {previewDialog.employee?.lastName}
            </DialogTitle>
            <DialogDescription>
              DNI: {previewDialog.employee?.dni} | {previewDialog.employee?.position}
            </DialogDescription>
          </DialogHeader>
          {previewDialog.employee && (
            <div className="space-y-4">
              {/* Photos row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Foto Original</p>
                  {previewDialog.employee.photoOriginal ? (
                    <img src={previewDialog.employee.photoOriginal} alt="Original" className="rounded-lg border mx-auto max-h-48 object-contain" />
                  ) : (
                    <div className="h-32 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">Sin foto</div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Carnet Anverso</p>
                  {previewDialog.employee.carnetFrontUrl ? (
                    <img src={previewDialog.employee.carnetFrontUrl} alt="Anverso" className="rounded-lg border mx-auto max-h-48 object-contain" />
                  ) : (
                    <div className="h-32 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">No generado</div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Carnet Reverso</p>
                  {previewDialog.employee.carnetBackUrl ? (
                    <img src={previewDialog.employee.carnetBackUrl} alt="Reverso" className="rounded-lg border mx-auto max-h-48 object-contain" />
                  ) : (
                    <div className="h-32 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">No generado</div>
                  )}
                </div>
              </div>
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm border-t pt-3">
                <div><span className="text-muted-foreground">Correo:</span> {previewDialog.employee.email}</div>
                <div><span className="text-muted-foreground">Periodo:</span> {previewDialog.employee.year}</div>
                <div><span className="text-muted-foreground">Registro:</span> {new Date(previewDialog.employee.createdAt).toLocaleDateString("es-PE")}</div>
                <div><span className="text-muted-foreground">Estado:</span> {previewDialog.employee.status === "active" ? "Activo" : "Inactivo"}</div>
              </div>
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
