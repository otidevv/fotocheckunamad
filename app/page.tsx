"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import PhotoUpload from "@/components/PhotoUpload";
import CarnetPreview from "@/components/CarnetPreview";
import { POSITIONS } from "@/lib/constants";
import Image from "next/image";
import { Send, Loader2, CheckCircle2, Search, Check, ChevronsUpDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function HomePage() {
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
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
  const [openCombo, setOpenCombo] = useState(false);
  const [dniExists, setDniExists] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "firstName" || name === "lastName") {
      setForm((prev) => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Auto-lookup DNI
  const lookupDni = useCallback(async (dni: string) => {
    if (!/^\d{8}$/.test(dni)) return;

    setLookingUp(true);
    setDniExists(false);
    try {
      // Check if DNI already registered in our system
      const checkRes = await fetch(`/api/employees/check-dni/${dni}`);
      if (checkRes.ok) {
        const existing = await checkRes.json();
        if (existing.exists) {
          setDniExists(true);
          setForm((prev) => ({
            ...prev,
            firstName: existing.employee.firstName || prev.firstName,
            lastName: existing.employee.lastName || prev.lastName,
            email: existing.employee.email || prev.email,
            position: existing.employee.position || prev.position,
          }));
          toast.info("Este DNI ya tiene un fotocheck registrado. Al enviar se actualizarán sus datos.");
          return;
        }
      }

      // If not in our system, lookup from external API
      const res = await fetch(`/api/consulta/${dni}`);
      if (!res.ok) {
        toast.error("No se encontró información para ese DNI");
        return;
      }
      const data = await res.json();

      setForm((prev) => ({
        ...prev,
        firstName: data.NOMBRES || prev.firstName,
        lastName: `${data.AP_PAT || ""} ${data.AP_MAT || ""}`.trim() || prev.lastName,
      }));
      toast.success("Datos encontrados y completados");
    } catch {
      toast.error("Error al consultar el DNI");
    } finally {
      setLookingUp(false);
    }
  }, []);

  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 8);
    setForm((prev) => ({ ...prev, dni: value }));
    if (value.length < 8) setDniExists(false);

    if (value.length === 8) {
      lookupDni(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.email || !form.dni || !form.firstName || !form.lastName) {
      toast.error("Todos los campos son obligatorios");
      return;
    }
    if (!/^\d{8}$/.test(form.dni)) {
      toast.error("El DNI debe tener exactamente 8 dígitos");
      return;
    }
    const finalPosition =
      form.position === "__otro__" ? form.customPosition : form.position;
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
      // 1. Process photo
      const photoFormData = new FormData();
      photoFormData.append("photo", photoFile);
      photoFormData.append("dni", form.dni);

      const photoRes = await fetch("/api/photos/process", {
        method: "POST",
        body: photoFormData,
      });
      if (!photoRes.ok) {
        const err = await photoRes.json();
        throw new Error(err.error || "Error al procesar foto");
      }
      const { photoUrl, photoOriginal } = await photoRes.json();

      // 2. Create employee
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
        throw new Error(err.error || "Error al registrar");
      }
      const employee = await empRes.json();

      // 3. Update with photo
      await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          dni: form.dni,
          firstName: form.firstName,
          lastName: form.lastName,
          position: finalPosition,
          photoUrl,
          photoOriginal,
        }),
      });

      // 4. Generate and save carnet (front + back)
      await fetch("/api/carnets/generate-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id }),
      });

      setSubmitted(true);
      toast.success(
        dniExists
          ? "Datos actualizados y nuevo fotocheck generado"
          : "Datos registrados y fotocheck generado"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al guardar"
      );
    } finally {
      setSaving(false);
    }
  };

  const finalPosition =
    form.position === "__otro__" ? form.customPosition : form.position;

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-brand/5 blur-3xl" />
          <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-64 h-64 rounded-full bg-brand-light/5 blur-3xl" />
        </div>
        <header className="bg-brand-dark text-white px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <Image src="/logo/logo.png" alt="UNAMAD" width={48} height={48} />
            <span className="font-bold text-sm">
              CARNET DE PERSONAL UNAMAD 2026
            </span>
          </div>
        </header>
        <div className="relative -mb-px">
          <svg className="w-full block" viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ height: "60px" }}>
            <path d="M0,0 L1440,0 L1440,60 Q1080,120 720,60 Q360,0 0,60 Z" fill="#312e81" />
            <path d="M0,0 L1440,0 L1440,40 Q1080,100 720,40 Q360,-20 0,40 Z" fill="#1e1b4b" opacity="0.3" />
          </svg>
        </div>
        <div className="flex items-center justify-center min-h-[80vh] relative">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">
                {dniExists ? "Fotocheck actualizado" : "Registro completado"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {dniExists
                  ? "Tus datos y foto han sido actualizados correctamente. Se ha generado un nuevo fotocheck reemplazando el anterior."
                  : "Tus datos y foto han sido enviados correctamente. Tu fotocheck será generado por la Oficina de Tecnologías de la Información."}
              </p>
              <Button
                onClick={() => {
                  setSubmitted(false);
                  setDniExists(false);
                  setForm({ email: "", dni: "", firstName: "", lastName: "", position: "", customPosition: "" });
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                variant="outline"
              >
                Registrar otro
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-brand/5 blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-64 h-64 rounded-full bg-brand-light/5 blur-3xl" />
        <svg className="absolute top-0 left-0 w-full opacity-[0.03]" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <circle cx="200" cy="150" r="80" fill="#4338ca" />
          <circle cx="800" cy="100" r="120" fill="#6366f1" />
          <circle cx="1200" cy="200" r="60" fill="#818cf8" />
        </svg>
      </div>

      {/* Header */}
      <header className="bg-brand-dark text-white px-6 py-3 shadow-md relative">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Image src="/logo/logo.png" alt="UNAMAD" width={48} height={48} />
          <span className="font-bold text-sm tracking-wide">
            CARNET DE PERSONAL UNAMAD 2026
          </span>
        </div>
      </header>

      {/* Wave after header */}
      <div className="relative -mb-px">
        <svg className="w-full block" viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ height: "60px" }}>
          <path d="M0,0 L1440,0 L1440,60 Q1080,120 720,60 Q360,0 0,60 Z" fill="#312e81" />
          <path d="M0,0 L1440,0 L1440,40 Q1080,100 720,40 Q360,-20 0,40 Z" fill="#1e1b4b" opacity="0.3" />
        </svg>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 relative">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* LEFT: Form */}
          <div className="flex-1">
            <Card>
              <CardContent className="p-6 sm:p-8">
                <h1 className="text-xl font-bold mb-1">
                  Registro de datos para Fotocheck
                </h1>
                <p className="text-sm text-muted-foreground mb-6">
                  Ingrese su DNI para autocompletar sus datos. Todos los campos
                  son obligatorios.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* DNI - FIRST */}
                  <div className="space-y-2">
                    <Label htmlFor="dni">
                      DNI <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="dni"
                        name="dni"
                        value={form.dni}
                        onChange={handleDniChange}
                        placeholder="Ingrese su DNI de 8 dígitos"
                        maxLength={8}
                        required
                        className="pr-10"
                      />
                      {lookingUp && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                      )}
                      {!lookingUp && form.dni.length === 8 && (
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    {dniExists ? (
                      <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                        <span>
                          Este DNI ya tiene un fotocheck registrado. Al enviar, se
                          reemplazarán los datos y se generará un nuevo fotocheck.
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Al ingresar 8 dígitos se consultarán sus datos
                        automáticamente
                      </p>
                    )}
                  </div>

                  {/* Names - auto-filled */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lastName">
                        APELLIDOS <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        placeholder="PÉREZ GÓMEZ"
                        className="uppercase"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="firstName">
                        NOMBRES <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="JUAN CARLOS"
                        className="uppercase"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      CORREO <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="correo@unamad.edu.pe"
                      required
                    />
                  </div>

                  {/* Position */}
                  <div className="space-y-2">
                    <Label>
                      CARGO <span className="text-destructive">*</span>
                    </Label>
                    <Popover open={openCombo} onOpenChange={setOpenCombo}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCombo}
                          className="w-full justify-between font-normal"
                        >
                          {form.position
                            ? form.position === "__otro__"
                              ? "Otro (especificar)"
                              : form.position
                            : "Seleccionar cargo..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar cargo..." />
                          <CommandList>
                            <CommandEmpty>No se encontró el cargo.</CommandEmpty>
                            <CommandGroup>
                              {POSITIONS.map((pos) => (
                                <CommandItem
                                  key={pos}
                                  value={pos}
                                  onSelect={() => {
                                    setForm((prev) => ({ ...prev, position: pos }));
                                    setOpenCombo(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      form.position === pos ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {pos}
                                </CommandItem>
                              ))}
                              <CommandItem
                                value="Otro (especificar)"
                                onSelect={() => {
                                  setForm((prev) => ({ ...prev, position: "__otro__" }));
                                  setOpenCombo(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    form.position === "__otro__" ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                Otro (especificar)
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {form.position === "__otro__" && (
                      <Input
                        name="customPosition"
                        value={form.customPosition}
                        onChange={handleChange}
                        placeholder="Escriba el cargo..."
                        className="mt-2 uppercase"
                      />
                    )}
                  </div>

                  {/* Photo */}
                  <div className="space-y-2">
                    <Label>
                      FOTOGRAFÍA <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground font-medium">
                      Debe cargar una foto tamaño carnet (240x288 px), fondo blanco, de frente, sin gorra ni lentes oscuros.
                    </p>
                    <PhotoUpload
                      onPhotoReady={(file, url) => {
                        setPhotoFile(file);
                        setPhotoPreview(url);
                      }}
                    />
                  </div>

                  {/* Specs */}
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <h3 className="font-semibold text-sm mb-2">
                      Especificaciones de la imagen
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Imagen a color con fondo blanco. Tomada de frente, sin
                      gorra y sin gafas o lentes de color oscuro. Sin sellos ni
                      enmendaduras. La imagen debe enfocarse en el rostro a
                      partir de los hombros. No mostrar medio cuerpo.
                    </p>
                    <p className="text-xs mb-3">
                      <strong>Formato:</strong> jpg
                    </p>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-brand-dark text-white">
                          <th className="px-3 py-1.5 text-left">N°</th>
                          <th className="px-3 py-1.5 text-left">Nombre</th>
                          <th className="px-3 py-1.5 text-left">Parámetro</th>
                          <th className="px-3 py-1.5 text-right">Desde</th>
                          <th className="px-3 py-1.5 text-right">Hasta</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="px-3 py-1.5">1</td>
                          <td className="px-3 py-1.5">Tamaño</td>
                          <td className="px-3 py-1.5">50kb</td>
                          <td className="px-3 py-1.5 text-right">4</td>
                          <td className="px-3 py-1.5 text-right">50</td>
                        </tr>
                        <tr className="border-b bg-muted/30">
                          <td className="px-3 py-1.5">2</td>
                          <td className="px-3 py-1.5">Dimensión alto</td>
                          <td className="px-3 py-1.5">Pixeles</td>
                          <td className="px-3 py-1.5 text-right">288</td>
                          <td className="px-3 py-1.5 text-right">288</td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-3 py-1.5">3</td>
                          <td className="px-3 py-1.5">Dimensión ancho</td>
                          <td className="px-3 py-1.5">Pixeles</td>
                          <td className="px-3 py-1.5 text-right">240</td>
                          <td className="px-3 py-1.5 text-right">240</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-1.5">4</td>
                          <td className="px-3 py-1.5">Resolución</td>
                          <td className="px-3 py-1.5">dpi</td>
                          <td className="px-3 py-1.5 text-right">300</td>
                          <td className="px-3 py-1.5 text-right">300</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full"
                    size="lg"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {saving ? "Enviando..." : dniExists ? "ACTUALIZAR FOTOCHECK" : "SUBIR ARCHIVO"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Preview */}
          <div className="lg:w-[370px]">
            <div className="sticky top-8 space-y-4">
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
      </main>

      {/* Wave before footer */}
      <div className="relative mt-8">
        <svg className="w-full block" viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ height: "60px" }}>
          <path d="M0,120 L0,60 Q360,0 720,60 Q1080,120 1440,60 L1440,120 Z" fill="#312e81" />
          <path d="M0,120 L0,80 Q360,20 720,80 Q1080,140 1440,80 L1440,120 Z" fill="#1e1b4b" opacity="0.3" />
        </svg>
      </div>

      {/* Footer */}
      <footer className="bg-brand-dark text-white py-4 px-6">
        <p className="text-center text-xs opacity-80">
          Universidad Nacional Amazónica de Madre de Dios - Oficina de
          Tecnologías de la Información &copy; 2026
        </p>
      </footer>
    </div>
  );
}
