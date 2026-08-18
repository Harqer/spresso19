import React from "react";
import { MaterialIcon } from "../../../MaterialIcon";
import { TripRecord } from "../../../../types";

interface TravelHeaderProps {
  trips: TripRecord[];
  activeTripId: string;
  setActiveTripId: (id: string) => void;
}

export const TravelHeader: React.FC<TravelHeaderProps> = ({ trips, activeTripId, setActiveTripId }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--md-sys-color-outline-variant)] pb-6">
      <div>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center shadow-md">
            <MaterialIcon icon="flight_takeoff" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black font-headline tracking-tight">Travel, Itinerary & Expense Manager</h1>
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">Smart receipt scanner, timeline tickets & expense budget tracker</p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {trips.map(trip => (
          <button
            key={trip.id}
            onClick={() => setActiveTripId(trip.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTripId === trip.id
                ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-md"
                : "bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)]"
            }`}
          >
            <MaterialIcon icon="place" size={14} />
            <span>{trip.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
