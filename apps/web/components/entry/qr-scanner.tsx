"use client";

import { useEffect, useRef, useState } from "react";
import type { QrScanMethod } from "@iocl/shared";
import { Camera, CameraOff, Keyboard, ScanLine, Sparkles, Usb } from "lucide-react";
import { toast } from "sonner";
import { DEMO_MODE } from "../../lib/api";
import { Button } from "../ui/button";

const DEMO_QR = `Crew Id : IOC11965186D0010
Name : RAGUPRABAHAR C 
Crew Type : Driver 
pass valid Upto : 03/08/2025 
TT No : TN74AZ8730 
DL No : Tn7420210005690 
DL Expiry Date : 02/07/2026`;

export function QRScanner({
  onDetected,
  loading,
}: {
  onDetected: (value: string, method: QrScanMethod) => void;
  loading?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [manual, setManual] = useState("");
  const [inputMethod, setInputMethod] = useState<"HARDWARE_SCANNER" | "MANUAL">("HARDWARE_SCANNER");

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  async function startCamera() {
    if (cameraActive) return;
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 180 });
      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      const preferred = devices.find((device) => /back|rear|environment/i.test(device.label)) ?? devices.at(-1);
      if (!preferred) throw new Error("No camera was detected");

      setCameraActive(true);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (!videoRef.current) throw new Error("Camera preview is not ready");

      controlsRef.current = await reader.decodeFromVideoDevice(preferred.deviceId, videoRef.current, (result) => {
        if (!result) return;
        controlsRef.current?.stop();
        controlsRef.current = null;
        setCameraActive(false);
        onDetected(result.getText(), "CAMERA");
      });
    } catch (error) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      setCameraActive(false);
      const message = error instanceof Error ? error.message : "Camera could not be started";
      toast.error(message.includes("Permission") ? "Camera permission was denied. Use the scanner input instead." : message);
    }
  }

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraActive(false);
  }

  function submitManual() {
    if (!manual.trim()) return toast.error("Enter or scan a QR value");
    onDetected(manual.trim(), inputMethod);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <div className="relative min-h-[320px] overflow-hidden rounded-3xl bg-iocl-navy shadow-xl">
        <div className="navy-grid absolute inset-0 opacity-60" />
        <video
          ref={videoRef}
          muted
          playsInline
          className={`absolute inset-0 h-full w-full object-cover transition-opacity ${cameraActive ? "opacity-100" : "opacity-0"}`}
        />
        {cameraActive ? (
          <>
            <div className="pointer-events-none absolute inset-7 rounded-3xl border-2 border-white/65">
              <div className="absolute left-4 right-4 top-5 h-0.5 animate-scan bg-gradient-to-r from-transparent via-iocl-orange to-transparent shadow-[0_0_18px_#F36F21]" />
              <span className="absolute -left-0.5 -top-0.5 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 border-iocl-orange" />
              <span className="absolute -right-0.5 -top-0.5 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 border-iocl-orange" />
              <span className="absolute -bottom-0.5 -left-0.5 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-iocl-orange" />
              <span className="absolute -bottom-0.5 -right-0.5 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-iocl-orange" />
            </div>
            <button
              type="button"
              onClick={stopCamera}
              className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950/75 px-4 py-2.5 text-sm font-bold text-white backdrop-blur"
            >
              <CameraOff className="h-4 w-4" /> Stop camera
            </button>
          </>
        ) : (
          <div className="relative flex min-h-[320px] flex-col items-center justify-center p-8 text-center text-white">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.08]">
              <ScanLine className="h-10 w-10 text-iocl-orange" />
            </div>
            <h3 className="mt-6 text-2xl font-black">Scan Driver / Crew Pass</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-white/55">
              Align the QR code inside the frame. Driver and pass details will be verified automatically.
            </p>
            <Button
              type="button"
              onClick={startCamera}
              icon={<Camera className="h-5 w-5" />}
              className="mt-6 min-w-48"
              disabled={loading}
            >
              Start Camera
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">

        {DEMO_MODE ? (
          <button
            type="button"
            onClick={() => {
              setManual(DEMO_QR);
              onDetected(DEMO_QR, "DEMO");
            }}
            className="flex w-full items-center gap-3 rounded-3xl border border-orange-200 bg-orange-50 p-5 text-left transition hover:bg-orange-100"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-iocl-orange shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-black text-orange-900">Load demo crew pass</span>
              <span className="mt-0.5 block text-xs text-orange-700">IOC11965186D0010 · RAGUPRABAHAR C</span>
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
