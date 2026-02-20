"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FieldConfig {
  x: string | number;
  y: number;
  fontSize: number;
  fontWeight?: string;
  color: string;
  maxWidth?: number;
  text?: string;
}

interface TemplateConfig {
  template: string;
  templateBack: string;
  cardWidth: number;
  cardHeight: number;
  front: {
    photoCircle: { cx: number; cy: number; radius: number };
    photo: { x: string | number; y: number; width: number; height: number };
    fields: Record<string, FieldConfig>;
  };
  back: {
    fields: Record<string, FieldConfig>;
    qr: { x: string | number; y: number; size: number };
  };
}

const FIELD_LABELS: Record<string, string> = {
  fullName: "Nombre completo",
  position: "Cargo",
  dni: "DNI",
  email: "Correo",
  institutionName: "Nombre institución",
  validity: "Vigencia",
  address: "Dirección",
};

export default function ConfigPage() {
  const [config, setConfig] = useState<TemplateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/templates/config.json")
      .then((r) => r.json())
      .then((d) => { setConfig(d); setLoading(false); })
      .catch(() => { toast.error("Error al cargar configuración"); setLoading(false); });
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
      if (!res.ok) throw new Error();
      toast.success("Configuración guardada");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const scale = 280 / config.cardWidth;
  const previewH = config.cardHeight * scale;

  const renderPreview = (side: "front" | "back") => {
    const circle = config.front.photoCircle;
    return (
    <div className="relative mx-auto rounded-xl overflow-hidden shadow-md border" style={{ width: 280, height: previewH, backgroundColor: "#FFF" }}>
      <img src={`/templates/${side === "front" ? config.template : config.templateBack}`} alt="" className="absolute inset-0 w-full h-full object-fill" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />

      {side === "front" && (
        <div className="absolute border-2 border-dashed border-blue-500 bg-blue-50/20" style={{
          left: circle.cx * scale - circle.radius * scale,
          top: circle.cy * scale - circle.radius * scale,
          width: circle.radius * 2 * scale,
          height: circle.radius * 2 * scale,
          borderRadius: "50%",
        }}>
          <span className="absolute inset-0 flex items-center justify-center text-blue-500 font-medium" style={{ fontSize: 8 }}>FOTO</span>
        </div>
      )}

      {Object.entries(side === "front" ? config.front.fields : config.back.fields).map(([key, f]) => (
        <div key={key} className="absolute left-0 right-0 text-center border-t border-dashed border-red-300" style={{ top: f.y * scale, fontSize: f.fontSize * scale, color: f.color }}>
          <span className="bg-red-50 px-1 text-red-500" style={{ fontSize: 7 }}>{FIELD_LABELS[key] || key}</span>
        </div>
      ))}

      {side === "back" && (
        <div className="absolute border border-dashed border-green-500 bg-green-50/30 rounded" style={{
          left: config.back.qr.x === "center" ? (280 - config.back.qr.size * scale) / 2 : Number(config.back.qr.x) * scale,
          top: config.back.qr.y * scale,
          width: config.back.qr.size * scale,
          height: config.back.qr.size * scale,
        }}>
          <span className="absolute inset-0 flex items-center justify-center text-green-600" style={{ fontSize: 7 }}>QR</span>
        </div>
      )}
    </div>);}

  const renderFieldControls = (fields: Record<string, FieldConfig>, side: "front" | "back") => (
    <div className="space-y-3">
      {Object.entries(fields).map(([key, field]) => (
        <Card key={key}>
          <CardContent className="p-4">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              {FIELD_LABELS[key] || key}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Y</Label>
                <Input type="number" value={field.y} onChange={(e) => {
                  const updated = { ...config };
                  (side === "front" ? updated.front.fields : updated.back.fields)[key] = { ...field, y: Number(e.target.value) };
                  setConfig({ ...updated });
                }} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Fuente</Label>
                <Input type="number" value={field.fontSize} onChange={(e) => {
                  const updated = { ...config };
                  (side === "front" ? updated.front.fields : updated.back.fields)[key] = { ...field, fontSize: Number(e.target.value) };
                  setConfig({ ...updated });
                }} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Color</Label>
                <input type="color" value={field.color} onChange={(e) => {
                  const updated = { ...config };
                  (side === "front" ? updated.front.fields : updated.back.fields)[key] = { ...field, color: e.target.value };
                  setConfig({ ...updated });
                }} className="w-full h-8 rounded border cursor-pointer" />
              </div>
              {field.text !== undefined && (
                <div className="col-span-2 sm:col-span-4">
                  <Label className="text-xs">Texto fijo</Label>
                  <Input value={field.text} onChange={(e) => {
                    const updated = { ...config };
                    (side === "front" ? updated.front.fields : updated.back.fields)[key] = { ...field, text: e.target.value };
                    setConfig({ ...updated });
                  }} className="h-8" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Configuración de Plantilla</h1>
          <p className="text-sm text-muted-foreground mt-1">Ajusta las posiciones de los elementos del fotocheck</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar
        </Button>
      </div>

      <Tabs defaultValue="front">
        <TabsList className="mb-4">
          <TabsTrigger value="front">Anverso</TabsTrigger>
          <TabsTrigger value="back">Reverso</TabsTrigger>
        </TabsList>

        <TabsContent value="front">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-[320px]">
              <Card className="sticky top-6">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Vista previa - Anverso</CardTitle></CardHeader>
                <CardContent>{renderPreview("front")}</CardContent>
              </Card>
            </div>
            <div className="flex-1 space-y-3">
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    Círculo de la foto (posición y tamaño)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div><Label className="text-xs">Centro X</Label><Input type="number" value={config.front.photoCircle.cx} onChange={(e) => setConfig({ ...config, front: { ...config.front, photoCircle: { ...config.front.photoCircle, cx: Number(e.target.value) } } })} className="h-8" /></div>
                    <div><Label className="text-xs">Centro Y</Label><Input type="number" value={config.front.photoCircle.cy} onChange={(e) => setConfig({ ...config, front: { ...config.front, photoCircle: { ...config.front.photoCircle, cy: Number(e.target.value) } } })} className="h-8" /></div>
                    <div><Label className="text-xs">Radio</Label><Input type="number" value={config.front.photoCircle.radius} onChange={(e) => setConfig({ ...config, front: { ...config.front, photoCircle: { ...config.front.photoCircle, radius: Number(e.target.value) } } })} className="h-8" /></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Plantilla: {config.cardWidth} x {config.cardHeight} px</p>
                </CardContent>
              </Card>
              {renderFieldControls(config.front.fields, "front")}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="back">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-[320px]">
              <Card className="sticky top-6">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Vista previa - Reverso</CardTitle></CardHeader>
                <CardContent>{renderPreview("back")}</CardContent>
              </Card>
            </div>
            <div className="flex-1 space-y-3">
              {renderFieldControls(config.back.fields, "back")}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    Código QR
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div><Label className="text-xs">Y</Label><Input type="number" value={config.back.qr.y} onChange={(e) => setConfig({ ...config, back: { ...config.back, qr: { ...config.back.qr, y: Number(e.target.value) } } })} className="h-8" /></div>
                    <div><Label className="text-xs">Tamaño</Label><Input type="number" value={config.back.qr.size} onChange={(e) => setConfig({ ...config, back: { ...config.back, qr: { ...config.back.qr, size: Number(e.target.value) } } })} className="h-8" /></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
