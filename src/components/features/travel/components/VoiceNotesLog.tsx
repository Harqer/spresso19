import React from "react";
import { MaterialIcon } from "../../../MaterialIcon";
import { VoiceNote } from "../../../../types";

interface VoiceNotesLogProps {
  voiceNotes: VoiceNote[];
  isRecording: boolean;
  toggleRecording: () => void;
}

export const VoiceNotesLog: React.FC<VoiceNotesLogProps> = ({ voiceNotes, isRecording, toggleRecording }) => {
  return (
    <div className="bg-[var(--md-sys-color-surface-container-low)] rounded-3xl p-5 border border-[var(--md-sys-color-outline-variant)] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MaterialIcon icon="mic" size={20} className="text-[var(--md-sys-color-primary)]" />
          <h3 className="font-bold text-sm">Audio Travel Notes</h3>
        </div>
        <button
          onClick={toggleRecording}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
            isRecording ? "bg-red-500 text-white animate-pulse" : "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]"
          }`}
        >
          <MaterialIcon icon={isRecording ? "stop" : "graphic_eq"} size={16} />
          <span>{isRecording ? "Recording Audio..." : "Record Voice Note"}</span>
        </button>
      </div>

      {voiceNotes.length === 0 ? (
        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] italic">No voice notes recorded yet for this trip. Tap Record to save audio notes.</p>
      ) : (
        <div className="space-y-2">
          {voiceNotes.map(vn => (
            <div key={vn.id} className="p-3 bg-[var(--md-sys-color-surface-container-lowest)] rounded-2xl border border-[var(--md-sys-color-outline-variant)] flex items-start space-x-3 text-xs">
              <MaterialIcon icon="record_voice_over" size={16} className="text-[var(--md-sys-color-primary)] mt-0.5" />
              <div>
                <p className="font-medium text-[var(--md-sys-color-on-surface)]">{vn.transcript}</p>
                <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">{vn.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
