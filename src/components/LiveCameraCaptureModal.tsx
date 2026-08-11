import React, { useState, useRef, useEffect } from "react";
import { MaterialIcon } from "./MaterialIcon";

interface LiveCameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
  title?: string;
  description?: string;
}

export const LiveCameraCaptureModal: React.FC<LiveCameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = "Google Lens",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [tappedPoint, setTappedPoint] = useState<{ x: number; y: number } | null>({ x: 50, y: 40 });
  const [activeMode, setActiveMode] = useState<string>("Search");
  const [flashOn, setFlashOn] = useState(false);

  const MODES = ["Translate", "Text", "Search", "Homework", "Shopping"];

  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
    setTappedPoint({ x, y });
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode: "environment" | "user") => {
    setIsInitializing(true);
    setCameraError(null);
    stopCamera();

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera access permission was denied. Please allow camera access in your browser or upload a photo.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera device found. You can upload an image file instead.");
      } else {
        setCameraError("Unable to open camera stream. Please try uploading an image.");
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleToggleCamera = () => {
    setFacingMode(prev => (prev === "environment" ? "user" : "environment"));
  };

  const handleSnapFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      stopCamera();
      onCapture(dataUrl);
      onClose();
    }
    setIsCapturing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        stopCamera();
        onCapture(reader.result as string);
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-0 sm:p-4 animate-fade-in">
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="relative w-full max-w-lg h-full sm:h-[88vh] bg-black text-white rounded-none sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
        
        {/* Top Header Overlay - Cloudy Liquid Glass */}
        <div className="absolute top-0 inset-x-0 z-30 p-3.5 bg-black/40 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-white/90 hover:text-white hover:bg-white/15 rounded-full transition cursor-pointer flex items-center justify-center backdrop-blur-md"
            title="Back"
          >
            <MaterialIcon icon="chevron_left" size={26} />
          </button>

          <div className="flex items-center space-x-1.5">
            <span className="text-sm font-bold text-white tracking-wide">Scan Camera</span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setFlashOn(!flashOn)}
              className={`p-2 rounded-full transition cursor-pointer backdrop-blur-md ${
                flashOn ? "text-yellow-400 bg-white/25" : "text-white/80 hover:bg-white/15"
              }`}
              title="Flash"
            >
              <MaterialIcon icon={flashOn ? "flash_on" : "flash_off"} size={20} />
            </button>
            <button
              onClick={handleToggleCamera}
              className="p-2 text-white/90 hover:text-white hover:bg-white/15 rounded-full transition cursor-pointer backdrop-blur-md"
              title="Flip Camera"
            >
              <MaterialIcon icon="cameraswitch" size={20} />
            </button>
          </div>
        </div>

        {/* Camera Viewport with Rounded Scan Bracket Reticle */}
        <div
          onClick={handleViewportClick}
          className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden cursor-pointer select-none"
        >
          {cameraError ? (
            <div className="p-6 text-center max-w-sm space-y-4">
              <div className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto border border-white/20">
                <MaterialIcon icon="videocam_off" size={28} />
              </div>
              <p className="text-xs text-white/80 leading-relaxed">{cameraError}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-white text-black text-xs font-bold rounded-full transition cursor-pointer shadow-md inline-flex items-center space-x-2"
              >
                <MaterialIcon icon="upload" size={18} />
                <span>Upload Photo</span>
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {isInitializing && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-3 text-white z-20">
                  <div className="w-9 h-9 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span className="text-xs font-medium text-white/80">Opening Google Lens camera...</span>
                </div>
              )}

              {/* ORGANIC LIQUID GLASS MORPH LENS ON USER TAPPED POINT */}
              {tappedPoint && (
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 transition-all duration-500 ease-out"
                  style={{ left: `${tappedPoint.x}%`, top: `${tappedPoint.y}%` }}
                >
                  <div className="relative w-20 h-18 backdrop-blur-2xl bg-white/25 border-2 border-white/90 shadow-[0_0_40px_rgba(255,255,255,0.8)] animate-liquid-morph overflow-hidden">
                    <div className="absolute top-1 left-2 w-8 h-3 bg-gradient-to-r from-white/90 to-transparent rounded-full blur-[0.5px] rotate-[-25deg]" />
                    <div className="absolute bottom-2 right-3 w-6 h-2 bg-white/60 rounded-full blur-[1px]" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Google Lens Controls & Mode Selector - Cloudy Liquid Glass Bar */}
        <div className="relative z-30 pb-6 pt-4 bg-slate-950/80 backdrop-blur-2xl border-t border-white/15 flex flex-col items-center space-y-4">
          {/* Floating Prompt Banner */}
          {!cameraError && (
            <div className="bg-black/75 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/10 text-white text-[12px] font-medium shadow-md">
              Tap object to focus blue dot • Tap shutter to search
            </div>
          )}

          {/* Shutter Button Row */}
          <div className="w-full px-8 flex items-center justify-between max-w-xs">
            {/* Gallery Upload Icon Thumbnail */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/30 text-white flex items-center justify-center transition cursor-pointer shadow-md overflow-hidden"
              title="Upload from gallery"
            >
              <MaterialIcon icon="photo_library" size={22} />
            </button>

            {/* Google Lens Large Circular Shutter Search Button */}
            {!cameraError && (
              <button
                onClick={handleSnapFrame}
                disabled={isInitializing || isCapturing}
                className="w-20 h-20 rounded-full bg-transparent border-4 border-white flex items-center justify-center cursor-pointer transition transform active:scale-90 shadow-2xl group"
                title="Search with Google Lens"
              >
                <div className="w-16 h-16 rounded-full bg-white group-hover:bg-slate-100 text-black flex items-center justify-center shadow-inner">
                  <MaterialIcon icon="search" size={28} className="text-slate-800" />
                </div>
              </button>
            )}

            {/* Empty Spacer to Balance Row */}
            <div className="w-12 h-12" />
          </div>

          {/* Mode Selector Pill Carousel */}
          <div className="w-full overflow-x-auto no-scrollbar px-4 py-1 flex items-center justify-center space-x-2">
            {MODES.map((mode) => {
              const isActive = activeMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setActiveMode(mode)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? "bg-white text-black shadow-md font-bold"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
