import { useState, useRef, useCallback, useEffect } from "react";
import { X, Camera, Loader2, RotateCcw, Check, AlertTriangle, ScanLine, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useDockVisibility } from "@/hooks/useDockVisibility";

interface ScanResult {
  establishment: string;
  date: string;
  total: number;
  category: string;
  type: "in" | "out";
  confidence: number;
  items?: { name: string; value: number }[];
}

interface ScanReceiptModalProps {
  open: boolean;
  onClose: () => void;
}

const ScanReceiptModal = ({ open, onClose }: ScanReceiptModalProps) => {
  const [step, setStep] = useState<"capture" | "processing" | "review">("capture");
  const [imageData, setImageData] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { addTransaction } = useFinancialData();
  useDockVisibility(open);

  // Check if getUserMedia is available
  const hasGetUserMedia = typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!open) stopCamera();
    return () => stopCamera();
  }, [open, stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);

    // Fallback: if getUserMedia not supported, use native file input with capture
    if (!hasGetUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready before playing
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      const errName = err?.name || "";
      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        setCameraError("Permissão da câmera negada. Habilite nas configurações do navegador.");
        toast.error("Permissão da câmera negada. Habilite nas configurações do navegador.");
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setCameraError("Nenhuma câmera encontrada neste dispositivo.");
        toast.error("Nenhuma câmera encontrada.");
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        setCameraError("Câmera em uso por outro aplicativo.");
        toast.error("Câmera em uso por outro app.");
      } else {
        setCameraError("Não foi possível acessar a câmera. Use a galeria.");
        toast.error("Erro ao acessar câmera. Tente pela galeria.");
      }
      // Offer native fallback
      cameraInputRef.current?.click();
    }
  }, [hasGetUserMedia]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const data = canvas.toDataURL("image/jpeg", 0.85);
    setImageData(data);
    stopCamera();
    processImage(data);
  }, [stopCamera]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Imagem muito grande (máx 10MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      setImageData(data);
      processImage(data);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const processImage = async (base64: string) => {
    setStep("processing");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sparky-scan", {
        body: { imageBase64: base64 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as ScanResult);
      setStep("review");
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar imagem");
      setStep("capture");
      setImageData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!result) return;
    try {
      const [d, m, y] = result.date.split("/");
      const date = new Date(+y, +m - 1, +d);
      if (isNaN(date.getTime())) throw new Error("Data inválida");

      await addTransaction({
        date: date.toISOString(),
        description: result.establishment,
        amount: result.total,
        type: result.type === "in" ? "income" : "expense",
        category: result.category,
      });

      toast.success("Transação registrada com sucesso!");
      handleClose();
    } catch {
      toast.error("Erro ao salvar transação.");
    }
  };

  const handleRetry = () => {
    setStep("capture");
    setImageData(null);
    setResult(null);
    setCameraError(null);
  };

  const handleClose = () => {
    stopCamera();
    setStep("capture");
    setImageData(null);
    setResult(null);
    setCameraError(null);
    onClose();
  };

  if (!open) return null;

  const lowConfidence = result && result.confidence < 0.7;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
              <ScanLine size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold">Escanear Documento</h2>
              <p className="text-[10px] text-muted-foreground">
                {step === "capture" ? "Tire uma foto ou selecione da galeria" :
                 step === "processing" ? "Processando com IA..." : "Revise os dados extraídos"}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* CAPTURE STEP */}
          {step === "capture" && (
            <>
              {cameraActive ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover bg-black" />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-8 border-2 border-white/30 rounded-xl" />
                    <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                    <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                    <button onClick={stopCamera} className="rounded-full bg-card/80 backdrop-blur-sm p-3 text-foreground active:scale-95 transition-all border border-border">
                      <X size={20} />
                    </button>
                    <button onClick={capturePhoto} className="rounded-full bg-primary p-4 text-primary-foreground active:scale-95 transition-all shadow-lg">
                      <Camera size={24} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Camera error state */}
                  {cameraError && (
                    <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 flex items-start gap-2">
                      <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-warning">Câmera indisponível</p>
                        <p className="text-[10px] text-muted-foreground">{cameraError}</p>
                      </div>
                    </div>
                  )}

                  <button onClick={startCamera}
                    className="w-full rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 py-12 flex flex-col items-center gap-3 transition-all active:scale-[0.98] hover:border-primary/50">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                      <Camera size={24} className="text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold">Abrir Câmera</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Tire uma foto da nota fiscal ou comprovante</p>
                    </div>
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted-foreground">ou</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border border-border bg-muted/30 py-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:bg-muted/50">
                    <ImageIcon size={16} className="text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Selecionar da Galeria</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* PROCESSING STEP */}
          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              {imageData && (
                <img loading="lazy" decoding="async" src={imageData} alt="Documento" className="w-32 h-32 rounded-xl object-cover border border-border opacity-50" />
              )}
              <Loader2 size={32} className="text-primary animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold">Analisando documento...</p>
                <p className="text-[10px] text-muted-foreground mt-1">A IA está extraindo as informações financeiras</p>
              </div>
            </div>
          )}

          {/* REVIEW STEP */}
          {step === "review" && result && (
            <>
              {lowConfidence && (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-warning">Baixa confiança na leitura</p>
                    <p className="text-[10px] text-muted-foreground">Revise os dados cuidadosamente antes de confirmar.</p>
                  </div>
                </div>
              )}

              {imageData && (
                <img loading="lazy" decoding="async" src={imageData} alt="Documento" className="w-full rounded-xl border border-border max-h-40 object-cover" />
              )}

              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Estabelecimento</span>
                    <span className="text-xs font-semibold">{result.establishment}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Data</span>
                    <span className="text-xs font-semibold">{result.date}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Valor Total</span>
                    <span className={cn("text-base font-bold tabular-nums", result.type === "in" ? "text-success" : "text-destructive")}>
                      {result.type === "in" ? "+" : "−"} R$ {result.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Categoria</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">{result.category}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Tipo</span>
                    <span className="text-xs font-medium">{result.type === "in" ? "Receita" : "Despesa"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Confiança</span>
                    <span className={cn("text-xs font-medium", result.confidence >= 0.8 ? "text-success" : result.confidence >= 0.5 ? "text-warning" : "text-destructive")}>
                      {Math.round(result.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {result.items && result.items.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-[10px] text-muted-foreground font-medium mb-2">Itens identificados</p>
                    <div className="space-y-1.5">
                      {result.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">{item.name}</span>
                          <span className="font-medium tabular-nums">R$ {item.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {step === "review" && (
          <div className="border-t border-border p-4 flex gap-2">
            <button onClick={handleRetry}
              className="flex-1 rounded-xl border border-border py-3 text-xs font-medium text-muted-foreground flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all">
              <RotateCcw size={14} /> Tentar novamente
            </button>
            <button onClick={handleConfirm}
              className="flex-1 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all">
              <Check size={14} /> Confirmar
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
        {/* Gallery picker */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        {/* Native camera fallback for devices without getUserMedia */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      </div>
    </div>
  );
};

export default ScanReceiptModal;
