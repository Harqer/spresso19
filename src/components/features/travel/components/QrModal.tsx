import React from "react";
import { MaterialIcon } from "../../../MaterialIcon";
import { ItineraryEvent } from "../../../../types";

interface QrModalProps {
  activeQrModalEvent: ItineraryEvent;
  setActiveQrModalEvent: (event: ItineraryEvent | null) => void;
}

export const QrModal: React.FC<QrModalProps> = ({ activeQrModalEvent, setActiveQrModalEvent }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--md-sys-color-surface-container-lowest)] rounded-3xl p-6 max-w-sm w-full border border-[var(--md-sys-color-outline-variant)] shadow-2xl text-center space-y-4">
        <h3 className="font-bold text-base">{activeQrModalEvent.title}</h3>
        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">{activeQrModalEvent.location}</p>

        <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-inner flex flex-col items-center space-y-3">
          <MaterialIcon icon="qr_code_2" size={140} className="text-stone-900" />
          <div className="font-mono text-[10px] text-stone-600 tracking-widest">{activeQrModalEvent.qrData}</div>
        </div>

        <button
          onClick={() => setActiveQrModalEvent(null)}
          className="w-full py-2.5 bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] rounded-full text-xs font-bold cursor-pointer"
        >
          Close Pass
        </button>
      </div>
    </div>
  );
};
