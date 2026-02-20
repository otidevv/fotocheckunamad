"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, CheckCircle2, XCircle, Loader2, ImagePlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
        setPreview(url);
        onPhotoReady(file, url);
      } else {
        URL.revokeObjectURL(url);
        setPreview(null);
      }
    },
    [onPhotoReady]
  );

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
    </div>
  );
}
