"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Loader2, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Employee {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  position: string;
  photoUrl: string | null;
}

export default function PrintPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("limit", "100");
      const res = await fetch(`/api/employees?${params}`);
      const data = await res.json();
      setEmployees(data.employees);
    } catch {
      toast.error("Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  }, [search]);

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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/carnets"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Impresión por Lotes</h1>
          <p className="text-sm text-muted-foreground">
            Selecciona el personal para generar PDF con múltiples fotochecks
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o DNI..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={handlePrint} disabled={generating || selected.size === 0} className="gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          Generar PDF ({selected.size})
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
