import React from "react";
import { MaterialIcon } from "../../../MaterialIcon";
import { ItineraryEvent } from "../../../../types";

interface BoardingPassListProps {
  tripEvents: ItineraryEvent[];
  setActiveQrModalEvent: (event: ItineraryEvent) => void;
}

export const BoardingPassList: React.FC<BoardingPassListProps> = ({ tripEvents, setActiveQrModalEvent }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center space-x-2">
          <MaterialIcon icon="confirmation_number" size={20} className="text-[var(--md-sys-color-primary)]" />
          <span>Itinerary & Boarding Pass Tickets</span>
        </h3>
        <span className="text-xs text-[var(--md-sys-color-on-surface-variant)]">{tripEvents.length} Verified Events</span>
      </div>

      <div className="space-y-4">
        {tripEvents.map(evt => (
          <div
            key={evt.id}
            className="bg-[var(--md-sys-color-surface-container-lowest)] rounded-3xl p-5 border border-[var(--md-sys-color-outline-variant)] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--md-sys-color-outline-variant)]/60 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)] flex items-center justify-center">
                  <MaterialIcon
                    icon={evt.type === "flight" ? "flight" : evt.type === "hotel" ? "hotel" : evt.type === "restaurant" ? "restaurant" : "confirmation_number"}
                    size={18}
                  />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--md-sys-color-on-surface)]">{evt.title}</h4>
                  <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">{evt.eventTime}</p>
                </div>
              </div>

              {evt.confirmationCode && (
                <span className="px-2.5 py-1 bg-[var(--md-sys-color-surface-container)] font-mono text-[10px] font-bold rounded-lg text-[var(--md-sys-color-on-surface-variant)] border border-[var(--md-sys-color-outline-variant)]">
                  REF: {evt.confirmationCode}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--md-sys-color-on-surface-variant)] block">Location</span>
                <span className="font-semibold truncate block">{evt.location}</span>
              </div>
              {evt.seat && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--md-sys-color-on-surface-variant)] block">Seat</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">{evt.seat}</span>
                </div>
              )}
              {evt.gate && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--md-sys-color-on-surface-variant)] block">Gate</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 block">{evt.gate}</span>
                </div>
              )}
              {evt.price && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--md-sys-color-on-surface-variant)] block">Cost</span>
                  <span className="font-bold text-[var(--md-sys-color-primary)] block">${evt.price}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] italic">{evt.description}</p>
              {evt.qrData && (
                <button
                  onClick={() => setActiveQrModalEvent(evt)}
                  className="px-3 py-1.5 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-full text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <MaterialIcon icon="qr_code_2" size={16} />
                  <span>View Pass QR</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
