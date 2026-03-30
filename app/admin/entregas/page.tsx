"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Search, Loader2, PackageCheck, PackageX, User, BadgeCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface EmployeeResult {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  oficina: string;
  photoUrl: string | null;
  cardPrinted: boolean;
  cardDelivered: boolean;
  deliveredAt: string | null;
  printedAt: string | null;
}

export default function EntregasPage() {
  const [dni, setDni] = useState("");
  const [searching, setSearching] = useState(false);
  const [employee, setEmployee] = useState<EmployeeResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [updating, setUpdating] = useState(false);

  const searchByDni = useCallback(async (dniValue: string) => {
    if (!/^\d{8}$/.test(dniValue)) {
      toast.error("Ingrese un DNI válido de 8 dígitos");
      return;
    }

    setSearching(true);
    setEmployee(null);
    setNotFound(false);

    try {
      const res = await fetch(`/api/employees?search=${dniValue}&limit=1`);
      if (!res.ok) throw new Error("Error al buscar");
      const data = await res.json();

      const found = data.employees?.find((e: EmployeeResult) => e.dni === dniValue);
      if (found) {
        setEmployee(found);
        setNotFound(false);
      } else {
        setEmployee(null);
        setNotFound(true);
      }
    } catch {
      toast.error("Error al buscar el empleado");
    } finally {
      setSearching(false);
    }
  }, []);

  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 8);
    setDni(value);
    setNotFound(false);
    setEmployee(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchByDni(dni);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchByDni(dni);
    }
  };

  const markDelivered = async (delivered: boolean) => {
    if (!employee) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/carnets/mark-delivered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id, delivered }),
      });
      if (!res.ok) throw new Error("Error al actualizar");

      setEmployee((prev) =>
        prev
          ? {
              ...prev,
              cardDelivered: delivered,
              deliveredAt: delivered ? new Date().toISOString() : null,
            }
          : null
      );
      toast.success(delivered ? "Fotocheck marcado como ENTREGADO" : "Se revirtió la entrega");
    } catch {
      toast.error("Error al actualizar el estado");
    } finally {
      setUpdating(false);
    }
  };

  const handleNewSearch = () => {
    setDni("");
    setEmployee(null);
    setNotFound(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Entrega de Fotochecks</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Busque por DNI y marque el fotocheck como entregado
        </p>
      </div>

      {/* Buscador */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-3 max-w-lg">
            <div className="relative flex-1">
              <Input
                value={dni}
                onChange={handleDniChange}
                onKeyDown={handleKeyDown}
                placeholder="Ingrese DNI de 8 dígitos..."
                maxLength={8}
                className="pr-10 text-lg h-12"
                autoFocus
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-primary" />
              )}
            </div>
            <Button type="submit" disabled={searching || dni.length !== 8} size="lg" className="h-12">
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Not Found */}
      {notFound && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">No se encontró el DNI: {dni}</p>
              <p className="text-sm text-amber-700">Verifique el número de documento e intente nuevamente.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {employee && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              Datos del Empleado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Foto */}
              <div className="shrink-0">
                {employee.photoUrl ? (
                  <Image
                    src={employee.photoUrl}
                    alt="Foto"
                    width={120}
                    height={144}
                    className="rounded-lg border object-cover"
                  />
                ) : (
                  <div className="w-[120px] h-[144px] rounded-lg border bg-muted flex items-center justify-center">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">DNI</p>
                    <p className="font-bold text-lg">{employee.dni}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nombre Completo</p>
                    <p className="font-semibold">{employee.lastName}, {employee.firstName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cargo</p>
                    <p className="text-sm">{employee.position}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Oficina / Dependencia</p>
                    <p className="text-sm">{employee.oficina || "—"}</p>
                  </div>
                </div>

                {/* Estado badges */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant={employee.cardPrinted ? "default" : "secondary"}>
                    {employee.cardPrinted ? "Impreso" : "No impreso"}
                  </Badge>
                  <Badge variant={employee.cardDelivered ? "default" : "outline"} className={employee.cardDelivered ? "bg-green-600" : ""}>
                    {employee.cardDelivered ? "Entregado" : "Pendiente de entrega"}
                  </Badge>
                </div>

                {employee.deliveredAt && (
                  <p className="text-xs text-muted-foreground">
                    Entregado el: {new Date(employee.deliveredAt).toLocaleString("es-PE")}
                  </p>
                )}

                {/* Warning si no está impreso */}
                {!employee.cardPrinted && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <span>Este fotocheck aún no ha sido marcado como impreso.</span>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-3 pt-3">
                  {!employee.cardDelivered ? (
                    <Button
                      onClick={() => markDelivered(true)}
                      disabled={updating}
                      className="bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      {updating ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <PackageCheck className="w-4 h-4 mr-2" />
                      )}
                      Marcar como Entregado
                    </Button>
                  ) : (
                    <Button
                      onClick={() => markDelivered(false)}
                      disabled={updating}
                      variant="outline"
                      size="lg"
                    >
                      {updating ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <PackageX className="w-4 h-4 mr-2" />
                      )}
                      Revertir Entrega
                    </Button>
                  )}

                  <Button variant="outline" onClick={handleNewSearch} size="lg">
                    Nueva Búsqueda
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
