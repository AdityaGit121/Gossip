import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Upload, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import jsQR from 'jsqr';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedText: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [scanResult, setScanResult] = useState<string>('');
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setError('');
    setScanResult('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setScanning(true);
        requestAnimationFrame(tick);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('Could not access camera. Please check permissions or upload a QR image.');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code) {
          handleDetectedCode(code.data);
          return;
        }
      }
    }
    if (scanning) {
      animationFrameRef.current = requestAnimationFrame(tick);
    }
  };

  const handleDetectedCode = (text: string) => {
    setScanResult(text);
    // Do NOT stop camera automatically here to allow real-time scanning
    // stopCamera();
    onScanSuccess(text);
    // Keep the scanner open, maybe show feedback, let user close it manually
    setTimeout(() => {
        setScanResult(''); // Reset scan result for next scan
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          handleDetectedCode(code.data);
        } else {
          setError('No valid QR code found in the uploaded image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0b0c10] border border-[#00e5ff]/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider">SCAN USER QR</h2>
              <p className="text-[10px] font-mono text-white/40">Point camera at user QR pass</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-center">
          {scanResult ? (
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <h3 className="text-sm font-bold text-emerald-300">QR CODE DETECTED!</h3>
              <p className="text-xs font-mono text-white/70 break-all bg-black/40 p-3 rounded-xl border border-emerald-500/20">
                {scanResult}
              </p>
            </div>
          ) : (
            <div className="relative w-full aspect-square bg-black/60 border-2 border-dashed border-[#00e5ff]/40 rounded-2xl overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {!scanning && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 space-y-2 p-4">
                  <div className="w-8 h-8 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-mono text-[#00e5ff]">Initializing Camera...</p>
                </div>
              )}

              {/* Viewfinder Overlay */}
              <div className="absolute inset-8 border border-[#00e5ff]/60 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="absolute w-4 h-4 border-t-2 border-l-2 border-[#00e5ff] top-0 left-0" />
                <div className="absolute w-4 h-4 border-t-2 border-r-2 border-[#00e5ff] top-0 right-0" />
                <div className="absolute w-4 h-4 border-b-2 border-l-2 border-[#00e5ff] bottom-0 left-0" />
                <div className="absolute w-4 h-4 border-b-2 border-r-2 border-[#00e5ff] bottom-0 right-0" />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-left text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload fallback */}
          <div className="pt-2">
            <label className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl text-xs font-mono text-white/80 cursor-pointer transition-all">
              <Upload className="w-4 h-4 text-[#00e5ff]" />
              <span>Upload QR Image File</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/[0.02] flex justify-end">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-mono text-white transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
