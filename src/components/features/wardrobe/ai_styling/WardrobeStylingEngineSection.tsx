import React from "react";
import { MaterialIcon } from "../../../MaterialIcon";
import { ErrorStateFallback, EmptyStateFallback } from "../../../shared/Fallbacks";

interface WardrobeStylingEngineSectionProps {
  activeSeason: string;
  setActiveSeason: (season: string) => void;
  stylingLoading: boolean;
  stylingError: boolean;
  curatedFits: any[];
  onRetry: () => void;
}

export const WardrobeStylingEngineSection: React.FC<WardrobeStylingEngineSectionProps> = ({
  activeSeason, setActiveSeason, stylingLoading, stylingError, curatedFits, onRetry
}) => {
  return (
    <div className="bg-[#e8efe0] dark:bg-[#1d2218] p-5 rounded-2xl border border-[#a9d291]/40 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono font-bold text-[#446732] dark:text-[#a9d291] uppercase tracking-wider">
            SMART STYLING ENGINE
          </span>
          <h2 className="text-sm font-extrabold text-[#191d16] dark:text-[#e1e4d9]">
            Weather-Tailored Outfit Curation
          </h2>
        </div>

        <div className="flex items-center space-x-2 bg-white dark:bg-[#191d16] p-1 rounded-xl border border-[#dfe4d7] dark:border-[#43483e]">
          {[
            { id: "Winter", label: "Winter Wear", icon: "ac_unit" },
            { id: "Summer", label: "Hot Summer", icon: "wb_sunny" },
            { id: "Occasion", label: "Special Occasion", icon: "auto_awesome" }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSeason(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                activeSeason === s.id
                  ? "bg-[#446732] text-white shadow-xs"
                  : "text-[#43483e] dark:text-[#c3c8bb] hover:text-[#446732]"
              }`}
            >
              <MaterialIcon icon={s.icon} size={14} />
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {stylingLoading ? (
        <div className="flex items-center justify-center space-x-2 text-xs text-[#446732] font-semibold py-8">
          <MaterialIcon icon="hourglass_empty" size={16} className="animate-spin" />
          <span>Curating tailor-made fits for {activeSeason}...</span>
        </div>
      ) : stylingError ? (
        <ErrorStateFallback
          title="Styling Engine Unavailable"
          message="Spresso's AI styling engine could not be reached. Please check your connection."
          onRetry={onRetry}
        />
      ) : curatedFits.length === 0 ? (
        <EmptyStateFallback
          icon="auto_awesome"
          title="No Outfits Found"
          description={`We couldn't generate fits for ${activeSeason}.`}
          actionLabel="Try Another Season"
          onAction={() => setActiveSeason("Winter")}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {curatedFits.map((fit, idx) => (
            <div key={idx} className="p-3.5 bg-white dark:bg-[#191d16] rounded-xl border border-[#dfe4d7] dark:border-[#43483e] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#191d16] dark:text-[#e1e4d9]">{fit.fitName}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#e8efe0] dark:bg-[#282b24] text-[#446732] dark:text-[#a9d291]">
                  {fit.season || activeSeason}
                </span>
              </div>
              <p className="text-[11px] text-[#43483e] dark:text-[#c3c8bb]">{fit.stylingNotes}</p>
              <div className="flex flex-wrap gap-1 pt-1">
                {fit.items?.map((item: string, i: number) => (
                  <span key={i} className="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-2 py-0.5 rounded font-mono">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
