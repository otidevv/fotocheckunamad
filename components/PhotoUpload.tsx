"use client";

import { useCallback, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, CheckCircle2, XCircle, Loader2, ImagePlus, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ValidationResult {
  label: string;
  passed: boolean | null;
}

interface PhotoUploadProps {
  onPhotoReady: (file: File, previewUrl: string) => void;
  currentPhoto?: string | null;
}

export default function PhotoUpload({ onPhotoReady, currentPhoto }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhoto || null);
  const [validating, setValidating] = useState(false);
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [pendingDimensions, setPendingDimensions] = useState<{ width: number; height: number } | null>(null);

  const validatePhoto = useCallback(
    async (file: File) => {
      setValidating(true);
      const results: ValidationResult[] = [
        { label: "Formato válido (JPG/PNG)", passed: null },
        { label: "Tamaño menor a 2MB", passed: null },
        { label: "Dimensiones mínimas (240×288px)", passed: null },
        { label: "Proporción correcta (~5:6)", passed: null },
      ];
      setValidations([...results]);

      results[0].passed = ["image/jpeg", "image/png"].includes(file.type);
      setValidations([...results]);

      await new Promise((r) => setTimeout(r, 200));

      results[1].passed = file.size <= 2 * 1024 * 1024;
      setValidations([...results]);

      const img = new Image();
      const url = URL.createObjectURL(file);

      await new Promise<void>((resolve) => {
        img.onload = () => {
          results[2].passed = img.width >= 240 && img.height >= 288;
          const ratio = img.width / img.height;
          results[3].passed = Math.abs(ratio - 5 / 6) <= 0.15;
          setValidations([...results]);
          resolve();
        };
        img.onerror = () => {
          results[2].passed = false;
          results[3].passed = false;
          setValidations([...results]);
          resolve();
        };
        img.src = url;
      });

      setValidating(false);

      if (results.every((r) => r.passed)) {
        // All validations passed - accept photo directly
        setPreview(url);
        onPhotoReady(file, url);
      } else if (results[0].passed && results[1].passed) {
        // Format and size are OK, but dimensions/ratio failed
        // Show modal to offer conversion
        setPendingFile(file);
        setPendingUrl(url);
        setPendingDimensions({ width: img.width, height: img.height });
        setShowConvertModal(true);
      } else {
        // Format or size failed - cannot convert
        URL.revokeObjectURL(url);
        setPreview(null);
      }
    },
    [onPhotoReady]
  );

  const handleAcceptConvert = useCallback(() => {
    if (pendingFile && pendingUrl) {
      setPreview(pendingUrl);
      onPhotoReady(pendingFile, pendingUrl);
      // Update validations to show converted status
      setValidations((prev) =>
        prev.map((v) => {
          if (!v.passed) {
            return { ...v, label: v.label + " (se convertirá)", passed: true };
          }
          return v;
        })
      );
    }
    setShowConvertModal(false);
    setPendingFile(null);
    setPendingUrl(null);
    setPendingDimensions(null);
  }, [pendingFile, pendingUrl, onPhotoReady]);

  const handleCancelConvert = useCallback(() => {
    if (pendingUrl) {
      URL.revokeObjectURL(pendingUrl);
    }
    setShowConvertModal(false);
    setPendingFile(null);
    setPendingUrl(null);
    setPendingDimensions(null);
    setPreview(null);
  }, [pendingUrl]);

  const onDrop = useCallback(
    (files: File[]) => {
      if (files.length > 0) validatePhoto(files[0]);
    },
    [validatePhoto]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [] },
    maxFiles: 1,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.01]"
            : preview
            ? "border-primary/30 bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        }`}
      >
        <input {...getInputProps()} />
        {preview ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-28 h-34 object-cover rounded-lg shadow-md border-2 border-white"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Clic o arrastra para cambiar la foto
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-sm">Arrastra la foto aquí</p>
            <p className="text-xs text-muted-foreground">
              JPG o PNG - Máximo 2MB - Mínimo 240×288px
            </p>
          </div>
        )}
      </div>

      {validations.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-1.5">
            {validations.map((v, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {v.passed === null ? (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
                ) : v.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive shrink-0" />
                )}
                <span className={v.passed === false ? "text-destructive" : "text-foreground"}>
                  {v.label}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Modal de conversión de foto */}
      <Dialog open={showConvertModal} onOpenChange={(open) => {
        if (!open) handleCancelConvert();
      }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <DialogTitle>Foto no cumple el formato de carnet</DialogTitle>
              </div>
            </div>
            <DialogDescription asChild>
              <div className="mt-3 space-y-3">
                <p>
                  La foto que subiste tiene un tamaño de{" "}
                  <strong>{pendingDimensions?.width}×{pendingDimensions?.height}px</strong>,
                  que no corresponde a la proporción requerida para un carnet (<strong>5:6</strong>, por ejemplo 240×288px).
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm">
                  <p className="font-semibold mb-1">Advertencia:</p>
                  <p>
                    Si decide continuar, la foto será redimensionada automáticamente al formato
                    de carnet. Esto puede causar <strong>distorsión o recorte</strong> en la imagen,
                    ya que no tiene las proporciones ideales.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Para mejores resultados, se recomienda usar una foto con proporción 5:6 (vertical, tipo carnet).
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelConvert}>
              Cancelar
            </Button>
            <Button variant="default" onClick={handleAcceptConvert} className="bg-amber-600 hover:bg-amber-700">
              Convertir de todas formas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
