import React from "react";
import { MaterialIcon } from "../../../MaterialIcon";
import { TripRecord } from "../../../../types";

interface ActiveTripHeroProps {
  currentTrip: TripRecord;
  onAskAI?: (prompt: string) => void;
}

export const ActiveTripHero: React.FC<ActiveTripHeroProps> = ({ currentTrip, onAskAI }) => {
  return (
    <div className="relative rounded-3xl overflow-hidden shadow-xl border border-[var(--md-sys-color-outline-variant)] h-56 bg-stone-900 group">
      <img src={currentTrip.coverImage} alt={currentTrip.title} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <span className="px-3 py-1 bg-emerald-500/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow">
            {currentTrip.status}
          </span>
          <button
            onClick={() => onAskAI?.(`Help me plan itinerary details and local recommendations for ${currentTrip.title} in ${currentTrip.destination}`)}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold rounded-full transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <MaterialIcon icon="auto_awesome" size={16} className="text-amber-300" />
            <span>Ask Travel Assistant</span>
          </button>
        </div>

        <div>
          <h2 className="text-2xl font-black text-white">{currentTrip.title}</h2>
          <p className="text-xs text-stone-300 font-medium flex items-center space-x-2 mt-1">
            <MaterialIcon icon="calendar_today" size={14} />
            <span>{currentTrip.startDate} <MaterialIcon icon="arrow_forward" size={12} /> {currentTrip.endDate} ({currentTrip.destination})</span>
          </p>
        </div>
      </div>
    </div>
  );
};
