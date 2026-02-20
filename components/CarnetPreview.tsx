"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CarnetPreviewProps {
  firstName: string;
  lastName: string;
  dni: string;
  position: string;
  email: string;
  photoUrl: string | null;
}

interface TemplateConfig {
  cardWidth: number;
  cardHeight: number;
  front: {
    photoCircle: { cx: number; cy: number; radius: number };
    photo: { x: string | number; y: number; width: number; height: number };
    fields: Record<string, { x: string | number; y: number; fontSize: number; fontWeight?: string; color: string; maxWidth?: number }>;
  };
  back: {
    fields: Record<string, { x: string | number; y: number; fontSize: number; fontWeight?: string; color: string; maxWidth?: number; text?: string }>;
    qr: { x: string | number; y: number; size: number };
  };
}

export default function CarnetPreview(props: CarnetPreviewProps) {
  const [config, setConfig] = useState<TemplateConfig | null>(null);
  const [hasTemplateFront, setHasTemplateFront] = useState(false);
  const [hasTemplateBack, setHasTemplateBack] = useState(false);

  useEffect(() => {
    fetch(`/templates/config.json?t=${Date.now()}`)
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});

    const img1 = new Image();
    img1.onload = () => setHasTemplateFront(true);
    img1.onerror = () => setHasTemplateFront(false);
    img1.src = "/templates/carnet-template.png";

    const img2 = new Image();
    img2.onload = () => setHasTemplateBack(true);
    img2.onerror = () => setHasTemplateBack(false);
    img2.src = "/templates/traseratrabajadores.png";
  }, []);

  if (!config) return null;

  const PREVIEW_W = 340;
  const scale = PREVIEW_W / config.cardWidth;
  const previewH = config.cardHeight * scale;

  const fieldValues: Record<string, string> = {
    fullName: `${props.firstName || "NOMBRES"} ${props.lastName || "APELLIDOS"}`,
    position: props.position || "CARGO",
    dni: `DNI: ${props.dni || "00000000"}`,
    email: props.email || "correo@unamad.edu.pe",
  };

  const circle = config.front.photoCircle;
  const circleCx = circle.cx * scale;
  const circleCy = circle.cy * scale;
  const circleR = circle.radius * scale * 1.15;

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Vista previa del Fotocheck</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="front" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="front">Anverso</TabsTrigger>
            <TabsTrigger value="back">Reverso</TabsTrigger>
          </TabsList>

          {/* FRONT */}
          <TabsContent value="front">
            <div
              className="relative mx-auto rounded-xl overflow-hidden shadow-md border"
              style={{ width: PREVIEW_W, height: previewH, backgroundColor: "#FFF" }}
            >
              {hasTemplateFront ? (
                <img
                  src="/templates/carnet-template.png"
                  alt=""
                  className="absolute inset-0 w-full h-full object-fill"
                />
              ) : (
                <>
                  <div
                    className="absolute left-0 right-0 top-0 flex flex-col items-center justify-center text-white"
                    style={{ height: 280 * scale, background: "linear-gradient(135deg, #1e1b4b, #4338ca)" }}
                  >
                    <span className="font-bold" style={{ fontSize: 9 }}>UNIVERSIDAD NACIONAL AMAZÓNICA</span>
                    <span className="font-bold" style={{ fontSize: 9 }}>DE MADRE DE DIOS</span>
                  </div>
                </>
              )}

              {/* Circular photo */}
              <div
                className="absolute overflow-hidden bg-gray-200"
                style={{
                  left: circleCx - circleR,
                  top: circleCy - circleR,
                  width: circleR * 2,
                  height: circleR * 2,
                  borderRadius: "50%",
                  border: "3px solid #FFFFFF",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                {props.photoUrl ? (
                  <img
                    src={props.photoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ objectPosition: "center 15%" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground" style={{ fontSize: 8 }}>
                    FOTO
                  </div>
                )}
              </div>

              {/* Fields with dynamic positioning */}
              {(() => {
                let nextY = 0;
                const fieldRefs: { key: string; lines: number; lineHeight: number; fontSize: number }[] = [];
                return Object.entries(config.front.fields).map(([key, f]) => {
                  const currentY = nextY > f.y * scale ? nextY : f.y * scale;
                  const fontSize = Math.max(f.fontSize * scale, 7);
                  const lineHeight = fontSize * 1.3;
                  const text = fieldValues[key] || "";
                  const maxW = (f.maxWidth || config.cardWidth - 100) * scale;
                  // Estimate lines based on maxWidth
                  const avgCharW = fontSize * (f.fontWeight === "bold" ? 0.65 : 0.55);
                  const charsPerLine = Math.floor(maxW / avgCharW);
                  const estimatedLines = Math.max(1, Math.ceil(text.length / charsPerLine));
                  fieldRefs.push({ key, lines: estimatedLines, lineHeight, fontSize });
                  nextY = currentY + estimatedLines * lineHeight + fontSize * 0.6;
                  return (
                    <div
                      key={key}
                      className="absolute text-center"
                      style={{
                        top: currentY,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: maxW,
                        fontSize,
                        fontWeight: f.fontWeight === "bold" ? 700 : 400,
                        color: f.color,
                        lineHeight: 1.3,
                        wordBreak: "break-word",
                      }}
                    >
                      {text}
                    </div>
                  );
                });
              })()}
            </div>
          </TabsContent>

          {/* BACK */}
          <TabsContent value="back">
            <div
              className="relative mx-auto rounded-xl overflow-hidden shadow-md border"
              style={{ width: PREVIEW_W, height: previewH, backgroundColor: "#FFF" }}
            >
              {hasTemplateBack ? (
                <img src="/templates/traseratrabajadores.png" alt="" className="absolute inset-0 w-full h-full object-fill" />
              ) : (
                <>
                  <div
                    className="absolute left-0 right-0 top-0 flex flex-col items-center justify-center text-white"
                    style={{ height: 280 * scale, background: "linear-gradient(135deg, #1e1b4b, #4338ca)" }}
                  >
                    <span className="font-bold" style={{ fontSize: 9 }}>UNAMAD</span>
                    <span style={{ fontSize: 7, color: "#818cf8" }}>REVERSO</span>
                  </div>
                </>
              )}

              {/* Back fields */}
              {Object.entries(config.back.fields).map(([key, f]) => (
                <div
                  key={key}
                  className="absolute left-0 right-0 text-center px-3"
                  style={{
                    top: f.y * scale,
                    fontSize: Math.max(f.fontSize * scale, 6),
                    fontWeight: f.fontWeight === "bold" ? 700 : 400,
                    color: f.color,
                  }}
                >
                  {f.text || fieldValues[key] || ""}
                </div>
              ))}

              {/* QR placeholder */}
              <div
                className="absolute flex flex-col items-center justify-center rounded-lg"
                style={{
                  left: config.back.qr.x === "center" ? (PREVIEW_W - config.back.qr.size * scale) / 2 : Number(config.back.qr.x) * scale,
                  top: config.back.qr.y * scale,
                  width: config.back.qr.size * scale,
                  height: config.back.qr.size * scale,
                  border: "1px dashed #a5b4fc",
                  backgroundColor: "rgba(99,102,241,0.05)",
                }}
              >
                <span className="text-muted-foreground" style={{ fontSize: 7 }}>QR</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
