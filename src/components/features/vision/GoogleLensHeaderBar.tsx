import React from "react";
import { MaterialIcon } from "../../MaterialIcon";

interface GoogleLensHeaderBarProps {
  isCapturingScreen: boolean;
  isScanning: boolean;
  onCaptureClick: () => void;
  onUploadClick: () => void;
  onClose: () => void;
}

export const GoogleLensHeaderBar: React.FC<GoogleLensHeaderBarProps> = ({
  isCapturingScreen,
  isScanning,
  onCaptureClick,
  onUploadClick,
  onClose,
}) => {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <MaterialIcon name="center_focus_strong" className="text-xl animate-pulse" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Google Lens Screen AI</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-mono border border-emerald-500/30">Live</span>
          </h2>
          <p className="text-[11px] text-slate-400">Drag to crop or tap objects to inspect</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onCaptureClick}
          disabled={isCapturingScreen || isScanning}
          className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
          title="Recapture Screen"
        >
          <MaterialIcon name="sync" className={`text-base ${isCapturingScreen ? "animate-spin" : ""}`} />
        </button>
        
        <button
          onClick={onUploadClick}
          disabled={isCapturingScreen || isScanning}
          className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          title="Upload Custom Image"
        >
          <MaterialIcon name="file_upload" className="text-base" />
        </button>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
          title="Close Lens"
        >
          <MaterialIcon name="close" className="text-base" />
        </button>
      </div>
    </div>
  );
};
