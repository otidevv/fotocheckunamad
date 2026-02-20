"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PhotoUpload from "@/components/PhotoUpload";
import CarnetPreview from "@/components/CarnetPreview";
import { POSITIONS } from "@/lib/constants";
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
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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
              email={form.email}
              photoUrl={photoPreview}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
