"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import PhotoUpload from "@/components/PhotoUpload";
import CarnetPreview from "@/components/CarnetPreview";
import { POSITIONS } from "@/lib/constants";
import { Save, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EditCarnetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", dni: "", firstName: "", lastName: "", position: "", customPosition: "" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((emp) => {
        const isCustom = !(POSITIONS as readonly string[]).includes(emp.position);
        setForm({
          email: emp.email, dni: emp.dni, firstName: emp.firstName, lastName: emp.lastName,
          position: isCustom ? "__otro__" : emp.position,
          customPosition: isCustom ? emp.position : "",
        });
        setExistingPhotoUrl(emp.photoUrl);
        setPhotoPreview(emp.photoUrl);
      })
      .catch(() => toast.error("Error al cargar"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "firstName" || name === "lastName" ? value.toUpperCase() : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPosition = form.position === "__otro__" ? form.customPosition : form.position;
    if (!finalPosition) { toast.error("Seleccione un cargo"); return; }

    setSaving(true);
    try {
      if (photoFile) {
        const fd = new FormData();
        fd.append("photo", photoFile);
        fd.append("dni", form.dni);
        const pr = await fetch("/api/photos/process", { method: "POST", body: fd });
        if (!pr.ok) throw new Error("Error al procesar foto");
      }

      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, dni: form.dni, firstName: form.firstName, lastName: form.lastName, position: finalPosition }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }

      toast.success("Datos actualizados");
      router.push("/admin/carnets");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const finalPosition = form.position === "__otro__" ? form.customPosition : form.position;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/carnets"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Editar Datos</h1>
          <p className="text-sm text-muted-foreground">Modifica la información del personal</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Datos del Personal</CardTitle>
              <CardDescription>Actualiza los campos necesarios</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label>CORREO *</Label>
                  <Input name="email" type="email" value={form.email} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>DNI *</Label>
                  <Input name="dni" value={form.dni} onChange={handleChange} maxLength={8} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>NOMBRES *</Label>
                    <Input name="firstName" value={form.firstName} onChange={handleChange} className="uppercase" required />
                  </div>
                  <div className="space-y-2">
                    <Label>APELLIDOS *</Label>
                    <Input name="lastName" value={form.lastName} onChange={handleChange} className="uppercase" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>CARGO *</Label>
                  <Select value={form.position} onValueChange={(v) => setForm((p) => ({ ...p, position: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      <SelectItem value="__otro__">Otro (especificar)</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.position === "__otro__" && (
                    <Input name="customPosition" value={form.customPosition} onChange={handleChange} placeholder="Escriba el cargo..." className="mt-2 uppercase" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>FOTO (opcional, para cambiar la actual)</Label>
                  <PhotoUpload onPhotoReady={(f, u) => { setPhotoFile(f); setPhotoPreview(u); }} currentPhoto={existingPhotoUrl} />
                </div>
                <Button type="submit" disabled={saving} className="w-full" size="lg">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="lg:w-[300px]">
          <div className="sticky top-6">
            <CarnetPreview firstName={form.firstName} lastName={form.lastName} dni={form.dni} position={finalPosition} email={form.email} photoUrl={photoPreview} />
          </div>
        </div>
      </div>
    </div>
  );
}
