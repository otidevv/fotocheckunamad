"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PhotoUpload from "@/components/PhotoUpload";
import CarnetPreview from "@/components/CarnetPreview";
import { POSITIONS, OFICINAS } from "@/lib/constants";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewCarnetPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    dni: "",
    firstName: "",
    lastName: "",
    position: "",
    customPosition: "",
    oficina: "",
    customOficina: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLocacion, setIsLocacion] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "firstName" || name === "lastName") {
      setForm((prev) => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.email || !form.dni || !form.firstName || !form.lastName) {
      toast.error("Todos los campos son obligatorios");
      return;
    }
    if (!/^\d{8}$/.test(form.dni)) {
      toast.error("El DNI debe tener 8 dígitos numéricos");
      return;
    }
    const finalPosition = form.position === "__otro__" ? form.customPosition : form.position;
    if (!finalPosition) {
      toast.error("Seleccione un cargo");
      return;
    }
    const finalOficina = form.oficina === "__otro__" ? form.customOficina : form.oficina;
    if (!photoFile) {
      toast.error("Debe subir una foto");
      return;
    }

    setSaving(true);
    try {
      const photoFormData = new FormData();
      photoFormData.append("photo", photoFile);
      photoFormData.append("dni", form.dni);

      const photoRes = await fetch("/api/photos/process", { method: "POST", body: photoFormData });
      if (!photoRes.ok) {
        const err = await photoRes.json();
        throw new Error(err.error || "Error al procesar foto");
      }
      const { photoUrl, photoOriginal } = await photoRes.json();

      const empRes = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          dni: form.dni,
          firstName: form.firstName,
          lastName: form.lastName,
          position: finalPosition,
          oficina: finalOficina,
          isLocacion,
        }),
      });
      if (!empRes.ok) {
        const err = await empRes.json();
        throw new Error(err.error || "Error al registrar empleado");
      }
      const employee = await empRes.json();

      await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...employee, photoUrl, photoOriginal }),
      });

      toast.success("Empleado registrado exitosamente");
      router.push("/admin/carnets");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const finalPosition = form.position === "__otro__" ? form.customPosition : form.position;
  const finalOficina = form.oficina === "__otro__" ? form.customOficina : form.oficina;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Nuevo Fotocheck</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registra los datos del personal y sube la foto para generar el fotocheck
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Form */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Datos del Personal</CardTitle>
              <CardDescription>Todos los campos marcados con * son obligatorios</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">CORREO *</Label>
                  <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="correo@unamad.edu.pe" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dni">DNI *</Label>
                  <Input id="dni" name="dni" value={form.dni} onChange={handleChange} placeholder="12345678" maxLength={8} required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">NOMBRES *</Label>
                    <Input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} placeholder="JUAN CARLOS" className="uppercase" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">APELLIDOS *</Label>
                    <Input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} placeholder="PÉREZ GÓMEZ" className="uppercase" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>CARGO *</Label>
                  <Select value={form.position} onValueChange={(val) => setForm((prev) => ({ ...prev, position: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cargo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((pos) => (
                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                      ))}
                      <SelectItem value="__otro__">Otro (especificar)</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.position === "__otro__" && (
                    <Input name="customPosition" value={form.customPosition} onChange={handleChange} placeholder="Escriba el cargo..." className="mt-2 uppercase" />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>OFICINA / DEPENDENCIA</Label>
                  <Select value={form.oficina} onValueChange={(val) => setForm((prev) => ({ ...prev, oficina: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar oficina..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OFICINAS.map((ofi) => (
                        <SelectItem key={ofi} value={ofi}>{ofi}</SelectItem>
                      ))}
                      <SelectItem value="__otro__">Otro (especificar)</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.oficina === "__otro__" && (
                    <Input name="customOficina" value={form.customOficina} onChange={handleChange} placeholder="Escriba la oficina..." className="mt-2 uppercase" />
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ¿El personal trabaja bajo contrato de locación de servicios? Marca la opción a continuación.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsLocacion(!isLocacion)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200 ${
                      isLocacion
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-400"
                        : "border-border bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isLocacion ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${isLocacion ? "text-blue-700 dark:text-blue-300" : "text-foreground"}`}>
                            Locación de Servicios
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {isLocacion
                              ? <>Marcado — el fotocheck incluirá la etiqueta <span className="font-mono font-bold text-blue-600 dark:text-blue-400">LOCACIÓN</span></>
                              : <>Agrega la etiqueta <span className="font-mono font-bold">LOCACIÓN</span> en el fotocheck</>
                            }
                          </p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isLocacion ? "border-blue-500 bg-blue-500" : "border-muted-foreground/40 bg-transparent"
                      }`}>
                        {isLocacion && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                </div>

                <div className="space-y-2">
                  <Label>FOTO *</Label>
                  <PhotoUpload onPhotoReady={(file, url) => { setPhotoFile(file); setPhotoPreview(url); }} />
                </div>

                <Button type="submit" disabled={saving} className="w-full" size="lg">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {saving ? "Guardando..." : "Registrar Personal"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:w-[300px]">
          <div className="sticky top-6">
            <CarnetPreview
              firstName={form.firstName}
              lastName={form.lastName}
              dni={form.dni}
              position={finalPosition}
              oficina={finalOficina}
              email={form.email}
              photoUrl={photoPreview}
              isLocacion={isLocacion}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
