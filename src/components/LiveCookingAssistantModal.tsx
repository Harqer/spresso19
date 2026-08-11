import React, { useState, useEffect, useRef } from "react";
import { MaterialIcon } from "./MaterialIcon";
import { M3ExpressiveCircularProgress } from "./M3ExpressiveCircularProgress";
import { logToCrashlytics } from "../lib/firebase";

interface LiveCookingAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeContext?: string;
}

export const LiveCookingAssistantModal: React.FC<LiveCookingAssistantModalProps> = ({
  isOpen,
  onClose,
  recipeContext
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [statusText, setStatusText] = useState("Connecting to Chef AI Live Agent...");
  const [transcript, setTranscript] = useState<{ sender: "user" | "ai"; text: string }[]>([]);
  const [aiIsSpeaking, setAiIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const queueTimeRef = useRef<number>(0);
  const videoFrameTimerRef = useRef<any>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    if (isOpen) {
      startLiveSession();
    } else {
      stopLiveSession();
    }

    return () => {
      stopLiveSession();
    };
  }, [isOpen]);

  const startLiveSession = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    setStatusText("Initializing camera and microphone...");

    let mediaStream: MediaStream | null = null;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      logToCrashlytics("warn", "Media devices error", { error: String(err) });
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err2: any) {
        logToCrashlytics("warn", "Fallback media devices error", { error: String(err2) });
        setErrorMsg("Camera or microphone permission was denied. Please allow camera & mic access to use the Live Cooking Agent.");
        setIsConnecting(false);
        return;
      }
    }

    // Connect to WebSocket endpoint directly to Gemini Live API
    setStatusText("Establishing real-time voice & video connection...");
    
    // Fallback to empty string for safety if env is missing
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_API_KEY";
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        logToCrashlytics("info", "[Live Cooking Modal] Connected to Gemini Live WebSocket");
        setIsConnected(true);
        setIsConnecting(false);
        setStatusText("Live Agent Ready — Speak or show your kitchen!");
        
        // Send Setup message to Gemini
        ws.send(JSON.stringify({
          setup: {
            model: "models/gemini-2.0-flash-exp",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
              }
            },
            systemInstruction: {
              parts: [{ text: "You are Chef AI, a real-time voice and video cooking assistant. You observe the user's kitchen counter or cooking ingredients via camera video stream, listen to their questions via live mic audio, and speak back with friendly, real-time step-by-step culinary guidance, ingredient substitutions, and local bargain grocery tips." }]
            }
          }
        }));

        if (recipeContext) {
          ws.send(JSON.stringify({
             clientContent: { turns: [{ role: "user", parts: [{ text: `Current cooking context / recipe requested: ${recipeContext}` }] }], turnComplete: true }
          }));
        }

        startMediaPipelines(mediaStream!, ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
             setAiIsSpeaking(true);
             playPCMChunk(data.serverContent.modelTurn.parts[0].inlineData.data);
          } else if (data.serverContent?.modelTurn?.parts?.[0]?.text) {
             const text = data.serverContent.modelTurn.parts[0].text;
             setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last && last.sender === "ai") {
                  return [...prev.slice(0, -1), { sender: "ai", text: last.text + " " + text }];
                }
                return [...prev, { sender: "ai", text: text }];
             });
          } else if (data.serverContent?.interrupted) {
             setAiIsSpeaking(false);
             if (outputAudioCtxRef.current) {
                queueTimeRef.current = outputAudioCtxRef.current.currentTime;
             }
          }
        } catch (e) {
          logToCrashlytics("warn", "[Live Cooking Modal] Error parsing message", { error: String(e) });
        }
      };

      ws.onerror = (e) => {
        logToCrashlytics("warn", "[Live Cooking Modal] WS error", { error: String(e) });
        setErrorMsg("Unable to connect to live voice server. Retrying...");
        setIsConnecting(false);
      };

      ws.onclose = () => {
        logToCrashlytics("info", "[Live Cooking Modal] WS closed");
        setIsConnected(false);
        setIsConnecting(false);
      };

    } catch (e: any) {
      setErrorMsg("Failed to start Live session: " + e.message);
      setIsConnecting(false);
    }
  };

  const startMediaPipelines = (mediaStream: MediaStream, ws: WebSocket) => {
    // 1. Audio Input (16kHz PCM mic stream)
    try {
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;

      const source = inputCtx.createMediaStreamSource(mediaStream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN && !isMicMuted) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBase64 = convertFloat32ToPCM16(inputData);
          ws.send(JSON.stringify({ 
             realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: pcmBase64 }] }
          }));
        }
      };
    } catch (e) {
      logToCrashlytics("warn", "Error setting up mic input stream", { error: String(e) });
    }

    // 2. Audio Output (24kHz PCM model playback)
    try {
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;
      queueTimeRef.current = outputCtx.currentTime;
    } catch (e) {
      logToCrashlytics("warn", "Error setting up audio output context", { error: String(e) });
    }

    // 3. Video Stream (1 FPS JPEG frame capture)
    if (videoFrameTimerRef.current) clearInterval(videoFrameTimerRef.current);
    videoFrameTimerRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current && !isVideoOff) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext("2d");
        if (ctx && video.videoWidth > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
          const base64Img = dataUrl.split(",")[1];
          ws.send(JSON.stringify({
             realtimeInput: { mediaChunks: [{ mimeType: "image/jpeg", data: base64Img }] }
          }));
        }
      }
    }, 1000); // 1 Frame Per Second as recommended by skill
  };

  const convertFloat32ToPCM16 = (input: Float32Array): string => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    let binary = "";
    const bytes = new Uint8Array(output.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const playPCMChunk = (base64PCM: string) => {
    const audioCtx = outputAudioCtxRef.current;
    if (!audioCtx) return;

    try {
      const binary = atob(base64PCM);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
      }

      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      const currentTime = audioCtx.currentTime;
      if (queueTimeRef.current < currentTime) {
        queueTimeRef.current = currentTime;
      }

      source.start(queueTimeRef.current);
      queueTimeRef.current += audioBuffer.duration;

      source.onended = () => {
        if (audioCtx.currentTime >= queueTimeRef.current) {
          setAiIsSpeaking(false);
        }
      };
    } catch (err) {
      logToCrashlytics("warn", "PCM playback error", { error: String(err) });
    }
  };

  const stopLiveSession = () => {
    if (videoFrameTimerRef.current) {
      clearInterval(videoFrameTimerRef.current);
      videoFrameTimerRef.current = null;
    }

    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch (e) {}
      scriptProcessorRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      try { inputAudioCtxRef.current.close(); } catch (e) {}
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      try { outputAudioCtxRef.current.close(); } catch (e) {}
      outputAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    setIsConnected(false);
    setIsConnecting(false);
    setAiIsSpeaking(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 animate-fade-in">
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative w-full max-w-xl h-full sm:h-[85vh] bg-slate-950 text-white rounded-none sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
        
        {/* Minimal Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-40 p-2.5 bg-black/40 hover:bg-black/70 text-white/80 hover:text-white rounded-full transition backdrop-blur-md cursor-pointer"
          title="Close"
        >
          <MaterialIcon icon="close" size={20} />
        </button>

        {/* Video Viewport & Gemini/Siri Live Voice Aura */}
        <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
          {errorMsg ? (
            <div className="p-6 text-center max-w-sm space-y-3 z-30">
              <MaterialIcon icon="videocam_off" size={32} className="text-slate-400 mx-auto" />
              <p className="text-xs text-slate-300 leading-relaxed">{errorMsg}</p>
              <button
                onClick={startLiveSession}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-full transition cursor-pointer"
              >
                Reconnect
              </button>
            </div>
          ) : (
            <>
              {/* Background Video Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-500 ${
                  isVideoOff ? "opacity-0" : "opacity-80"
                }`}
              />

              {/* Dark subtle overlay if video is off or active */}
              {isVideoOff && (
                <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
                  <span className="text-xs text-slate-500 font-sans tracking-wide">Camera off</span>
                </div>
              )}

              {/* Minimal Siri / Gemini Live Animated Voice Orb in Center */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                <div className="relative flex items-center justify-center">
                  {/* Outer glowing aura */}
                  <div
                    className={`w-36 h-36 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 blur-2xl opacity-40 transition-all duration-300 ${
                      aiIsSpeaking ? "scale-125 opacity-70 animate-pulse" : "scale-100"
                    }`}
                  />
                  {/* Inner orb */}
                  <div
                    className={`w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-400 via-teal-300 to-cyan-300 shadow-2xl transition-transform duration-300 flex items-center justify-center ${
                      aiIsSpeaking ? "scale-110" : "scale-100"
                    }`}
                  >
                    <div className="w-16 h-16 rounded-full bg-slate-950/20 backdrop-blur-sm flex items-center justify-center">
                      <MaterialIcon icon="graphic_eq" size={28} className="text-white opacity-90" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Expressive M3 Progressive Connecting Indicator */}
              {isConnecting && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-white z-30">
                  <M3ExpressiveCircularProgress
                    size={64}
                    icon="videocam"
                    colorClass="stroke-emerald-400"
                    label="Connecting Live Agent..."
                    sublabel={statusText || "Establishing WebRTC & Audio Channel"}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Minimal Subtitle Overlay / Fading Transcript */}
        <div className="px-6 py-3 bg-gradient-to-t from-black via-black/90 to-transparent min-h-[60px] flex items-center justify-center text-center z-30">
          {transcript.length > 0 ? (
            <p className="text-xs text-slate-200 font-sans leading-relaxed max-w-md animate-fade-in line-clamp-2">
              {transcript[transcript.length - 1].text}
            </p>
          ) : (
            <span className="text-[11px] text-slate-400 font-sans tracking-wide font-light">
              Listening & watching live • Speak naturally
            </span>
          )}
        </div>

        {/* Minimal Siri-style Bottom Controls */}
        <div className="pb-8 pt-3 bg-black flex items-center justify-center space-x-6 z-30">
          <button
            onClick={() => setIsMicMuted(!isMicMuted)}
            className={`w-12 h-12 rounded-full transition cursor-pointer flex items-center justify-center ${
              isMicMuted ? "bg-red-600/90 text-white" : "bg-slate-800/80 hover:bg-slate-700 text-white"
            }`}
            title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
          >
            <MaterialIcon icon={isMicMuted ? "mic_off" : "mic"} size={20} />
          </button>

          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`w-12 h-12 rounded-full transition cursor-pointer flex items-center justify-center ${
              isVideoOff ? "bg-red-600/90 text-white" : "bg-slate-800/80 hover:bg-slate-700 text-white"
            }`}
            title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
          >
            <MaterialIcon icon={isVideoOff ? "videocam_off" : "videocam"} size={20} />
          </button>

          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white transition cursor-pointer flex items-center justify-center shadow-lg"
            title="End Call"
          >
            <MaterialIcon icon="call_end" size={20} />
          </button>
        </div>

      </div>
    </div>
  );
};
