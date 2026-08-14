import React from "react";
import { MaterialIcon } from "../../MaterialIcon";
import { ProductItem } from "../../../types";

interface Product360SpinModalProps {
  spin360Product: ProductItem;
  spin360Angle: number;
  isAutoSpinning: boolean;
  tiltX: number;
  tiltY: number;
  active360AngleIdx: number;
  setSpin360Product: (p: ProductItem | null) => void;
  setSpin360Angle: (a: number) => void;
  setIsAutoSpinning: (a: boolean) => void;
  setTiltX: (t: number) => void;
  setTiltY: (t: number) => void;
  setActive360AngleIdx: (i: number) => void;
  onSelectTryOn: (p: ProductItem) => void;
  onAddToCart?: (p: ProductItem) => void;
}

export const Product360SpinModal: React.FC<Product360SpinModalProps> = ({
  spin360Product, spin360Angle, isAutoSpinning, tiltX, tiltY, active360AngleIdx,
  setSpin360Product, setSpin360Angle, setIsAutoSpinning, setTiltX, setTiltY, setActive360AngleIdx, onSelectTryOn, onAddToCart
}) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
    <div className="bg-gradient-to-b from-stone-900 via-stone-950 to-black text-white rounded-3xl border border-stone-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl my-auto">
      <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-stone-900/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#386633] text-white flex items-center justify-center shadow-lg"><MaterialIcon icon="360" size={22} /></div>
          <div><div className="flex items-center space-x-2"><h2 className="font-bold text-base text-white">{spin360Product.name}</h2></div><p className="text-xs text-stone-400">{spin360Product.brand} · ${(spin360Product.price || 0).toFixed(2)} · Cinematic Parallax View</p></div>
        </div>
        <button onClick={() => setSpin360Product(null)} className="w-9 h-9 rounded-full bg-stone-800 border border-stone-700 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition cursor-pointer"><MaterialIcon icon="close" size={18} /></button>
      </div>
      <div className="relative flex-1 min-h-[340px] flex items-center justify-center p-8 bg-gradient-to-b from-stone-950 via-black to-stone-950 overflow-hidden cursor-grab active:cursor-grabbing select-none" onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setTiltX(((e.clientX - rect.left) / rect.width - 0.5) * 12); setTiltY((-(e.clientY - rect.top) / rect.height - 0.5) * 12); }} onMouseLeave={() => { setTiltX(0); setTiltY(0); }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,102,51,0.25)_0%,transparent_70%)] pointer-events-none"></div>
        <div className="relative transition-transform duration-75 ease-out max-w-md w-full flex items-center justify-center" style={{ perspective: "1200px", transformStyle: "preserve-3d" }}>
          <div className="relative transition-all duration-100 ease-out flex items-center justify-center" style={{ transform: `perspective(1000px) rotateY(${spin360Angle}deg) rotateX(${tiltY}deg) rotateZ(${tiltX * 0.3}deg) scale(1.05)`, filter: "drop-shadow(0 25px 25px rgba(0, 0, 0, 0.7))" }}>
            <img src={(spin360Product.genMediaKit?.angles && spin360Product.genMediaKit.angles[active360AngleIdx]) || spin360Product.image} alt={spin360Product.name} className="max-h-[320px] object-contain rounded-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rounded-2xl pointer-events-none"></div>
          </div>
          <div className="absolute -bottom-8 w-64 h-8 bg-black/60 rounded-[100%] blur-xl pointer-events-none" style={{ transform: `scale(${1 + Math.sin((spin360Angle * Math.PI) / 180) * 0.15})` }}></div>
        </div>
        <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md border border-stone-800 rounded-full text-[11px] font-mono text-emerald-400 font-bold flex items-center space-x-1.5"><MaterialIcon icon="360" size={14} /><span>Orbit: {Math.round(spin360Angle)}°</span></div>
        <div className="absolute bottom-4 right-4 flex items-center space-x-2"><button onClick={() => setIsAutoSpinning(!isAutoSpinning)} className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center space-x-1.5 border transition cursor-pointer ${isAutoSpinning ? "bg-emerald-600 text-white border-emerald-500 shadow-md" : "bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700"}`}><MaterialIcon icon={isAutoSpinning ? "pause" : "play_arrow"} size={16} /><span>{isAutoSpinning ? "Pause Auto Orbit" : "Auto Orbit ON"}</span></button></div>
      </div>
      <div className="p-5 bg-stone-900/90 border-t border-stone-800 space-y-4">
        <div className="space-y-1"><div className="flex justify-between items-center text-xs font-mono text-stone-400"><span>360° Studio Rotation Angle</span><span className="text-emerald-400 font-bold">{Math.round(spin360Angle)}°</span></div><input type="range" min="0" max="360" value={spin360Angle} onChange={(e) => { setIsAutoSpinning(false); setSpin360Angle(Number(e.target.value)); }} className="w-full accent-emerald-500 cursor-pointer" /></div>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[{ label: "Front 0°", angle: 0, idx: 0 }, { label: "Quarter 45°", angle: 45, idx: 1 }, { label: "Profile 90°", angle: 90, idx: 2 }, { label: "Rear 180°", angle: 180, idx: 3 }, { label: "Detail 270°", angle: 270, idx: 4 }].map((preset) => (
            <button key={preset.label} onClick={() => { setIsAutoSpinning(false); setSpin360Angle(preset.angle); setActive360AngleIdx(preset.idx); }} className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition flex items-center space-x-1 cursor-pointer whitespace-nowrap ${Math.abs(spin360Angle - preset.angle) < 15 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : "bg-stone-800/80 text-stone-400 border-stone-700/60 hover:text-white hover:bg-stone-800"}`}><MaterialIcon icon="3d_rotation" size={14} /><span>{preset.label}</span></button>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 gap-3">
          <button onClick={() => { const prod = spin360Product; setSpin360Product(null); if (onSelectTryOn) onSelectTryOn(prod); }} className="flex-1 py-3 bg-[#386633] hover:bg-[#2c5227] text-white rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg cursor-pointer"><MaterialIcon icon="dry_cleaning" size={18} /><span>Animate (Virtual Try-On)</span></button>
          <button onClick={() => { if (onAddToCart) onAddToCart(spin360Product); setSpin360Product(null); }} className="px-6 py-3 bg-white hover:bg-stone-100 text-stone-900 rounded-2xl font-bold text-xs flex items-center justify-center space-x-1.5 transition shadow-lg cursor-pointer"><MaterialIcon icon="add_shopping_cart" size={18} /><span>Add to Wardrobe</span></button>
        </div>
      </div>
    </div>
  </div>
);
