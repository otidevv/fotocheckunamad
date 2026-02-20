"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Employee {
  id: string;
  email: string;
  dni: string;
  firstName: string;
  lastName: string;
  position: string;
  photoUrl: string | null;
  cardGenerated: boolean;
}

export default function GenerateCarnetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setEmployee)
      .catch(() => toast.error("Empleado no encontrado"))
      .finally(() => setLoading(false));
  }, [id]);

  const generateCarnet = async () => {
    setGenerating(true);
    try {
      // Generate front
      const frontRes = await fetch("/api/carnets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: id, side: "front" }),
      });
      if (!frontRes.ok) throw new Error();
      const frontBlob = await frontRes.blob();
      setFrontUrl(URL.createObjectURL(frontBlob));

      // Generate back
      const backRes = await fetch("/api/carnets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: id, side: "back" }),
      });
      if (!backRes.ok) throw new Error();
      const backBlob = await backRes.blob();
      setBackUrl(URL.createObjectURL(backBlob));

      toast.success("Fotocheck generado (anverso y reverso)");
    } catch {
      toast.error("Error al generar fotocheck");
    } finally {
      setGenerating(false);
    }
  };

  const downloadPNG = (side: "front" | "back") => {
    const url = side === "front" ? frontUrl : backUrl;
    if (!url || !employee) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `fotocheck-${employee.dni}-${side === "front" ? "anverso" : "reverso"}.png`;
    a.click();
  };

  const downloadPDF = async () => {
    if (!employee) return;
    try {
      const res = await fetch("/api/carnets/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: id }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fotocheck-${employee.dni}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al generar PDF");
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!employee) return <div className="text-center py-20 text-muted-foreground">Empleado no encontrado</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/carnets">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Fotocheck de {employee.lastName} {employee.firstName}</h1>
          <p className="text-sm text-muted-foreground">DNI: {employee.dni}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Carnet display */}
        <div className="flex-1">
          <Card>
            <CardContent className="p-6">
              {frontUrl || backUrl ? (
                <Tabs defaultValue="front" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="front">Anverso</TabsTrigger>
                    <TabsTrigger value="back">Reverso</TabsTrigger>
                  </TabsList>
                  <TabsContent value="front" className="flex justify-center">
                    {frontUrl && <img src={frontUrl} alt="Anverso" className="max-w-xs rounded-xl shadow-lg border" />}
                  </TabsContent>
                  <TabsContent value="back" className="flex justify-center">
                    {backUrl && <img src={backUrl} alt="Reverso" className="max-w-xs rounded-xl shadow-lg border" />}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <div className="w-48 h-72 bg-muted rounded-xl border-2 border-dashed flex items-center justify-center mb-4">
                    <p className="text-sm text-center px-4">
                      Haz clic en &quot;Generar&quot; para crear el fotocheck
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar actions */}
        <div className="lg:w-72 space-y-4">
          <Button onClick={generateCarnet} disabled={generating} className="w-full gap-2" size="lg">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {generating ? "Generando..." : frontUrl ? "Regenerar" : "Generar Fotocheck"}
          </Button>

          {frontUrl && (
            <div className="space-y-2">
              <Button variant="outline" onClick={() => downloadPNG("front")} className="w-full gap-2">
                <Download className="w-4 h-4" /> PNG Anverso
              </Button>
              <Button variant="outline" onClick={() => downloadPNG("back")} className="w-full gap-2">
                <Download className="w-4 h-4" /> PNG Reverso
              </Button>
              <Button variant="outline" onClick={downloadPDF} className="w-full gap-2">
                <FileText className="w-4 h-4" /> PDF Completo
              </Button>
            </div>
          )}

          <Separator />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Datos del personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Nombre completo</span>
                <p className="font-medium">{employee.lastName} {employee.firstName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">DNI</span>
                <p className="font-medium">{employee.dni}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Cargo</span>
                <p className="font-medium">{employee.position}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Correo</span>
                <p className="font-medium text-xs break-all">{employee.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fotocheck</span>
                <div className="mt-1">
                  <Badge variant={employee.cardGenerated ? "default" : "secondary"}>
                    {employee.cardGenerated ? "Generado" : "Pendiente"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
