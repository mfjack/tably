"use client";

import { useEffect, useRef, useState } from "react";
import { DetailsDialog } from "@/components/dialog/details-dialog";
import { DIALOG_ACTION_BUTTON_CLASS_NAME } from "@/components/dialog/dialog-styles";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { barcodeToDigitableLine } from "../boleto";

const SCAN_INTERVAL_IN_MS = 250;
const CAMERA_PERMISSION_MESSAGE =
  "Permita o uso da câmera no navegador para ler o código de barras.";
const CAMERA_FAILURE_MESSAGE =
  "Não foi possível abrir a câmera. Cole ou digite o código.";

type ScannerStatus =
  | { kind: "starting" }
  | { kind: "scanning" }
  | { kind: "error"; message: string };

type BoletoScannerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (digitableLine: string) => void;
};

function getCameraErrorMessage(error: unknown): string {
  return error instanceof DOMException && error.name === "NotAllowedError"
    ? CAMERA_PERMISSION_MESSAGE
    : CAMERA_FAILURE_MESSAGE;
}

export function BoletoScannerDialog({
  isOpen,
  onClose,
  onDetected,
}: BoletoScannerDialogProps) {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );
  const [status, setStatus] = useState<ScannerStatus>({ kind: "starting" });
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  useEffect(() => {
    if (!isOpen || !videoElement) return;
    const video = videoElement;
    let isActive = true;
    let stream: MediaStream | null = null;
    let scanTimer: number | undefined;

    async function scanFrame(
      detector: InstanceType<
        typeof import("barcode-detector/ponyfill").BarcodeDetector
      >,
    ) {
      if (!isActive) return;
      try {
        const barcodes = await detector.detect(video);
        for (const barcode of barcodes) {
          const digitableLine = barcodeToDigitableLine(barcode.rawValue);
          if (digitableLine && isActive) {
            isActive = false;
            onDetectedRef.current(digitableLine);
            return;
          }
        }
      } catch {
        if (!isActive) return;
      }
      scanTimer = window.setTimeout(
        () => void scanFrame(detector),
        SCAN_INTERVAL_IN_MS,
      );
    }

    async function startCamera() {
      setStatus({ kind: "starting" });
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (!isActive) return;
        video.srcObject = stream;
        await video.play();
        const { BarcodeDetector } = await import("barcode-detector/ponyfill");
        if (!isActive) return;
        setStatus({ kind: "scanning" });
        void scanFrame(new BarcodeDetector({ formats: ["itf"] }));
      } catch (error) {
        if (isActive) {
          setStatus({ kind: "error", message: getCameraErrorMessage(error) });
        }
      }
    }

    void startCamera();
    return () => {
      isActive = false;
      window.clearTimeout(scanTimer);
      for (const track of stream?.getTracks() ?? []) track.stop();
      video.srcObject = null;
    };
  }, [isOpen, videoElement]);

  return (
    <DetailsDialog
      isOpen={isOpen}
      onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}
      title="Escanear boleto"
      footer={
        <Button
          type="button"
          variant="outline"
          className={cn(DIALOG_ACTION_BUTTON_CLASS_NAME, "col-span-2")}
          onClick={onClose}
        >
          Cancelar
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          Aponte a câmera para o código de barras, com o boleto deitado e bem
          iluminado.
        </p>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-foreground">
          <video
            ref={setVideoElement}
            muted
            playsInline
            aria-label="Imagem da câmera"
            className="size-full object-cover"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-destructive/80"
          />
          {status.kind === "starting" && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-foreground/60 text-background text-sm">
              <Spinner aria-hidden />
              Abrindo a câmera…
            </div>
          )}
        </div>
        <p
          role="status"
          className={cn(
            "text-sm",
            status.kind === "error"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {status.kind === "error"
            ? status.message
            : status.kind === "scanning"
              ? "Procurando o código de barras…"
              : "Preparando a leitura…"}
        </p>
      </div>
    </DetailsDialog>
  );
}
