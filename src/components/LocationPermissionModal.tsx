import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MaterialIcon } from "./MaterialIcon";
import { getCleanLocationName } from "../lib/location";

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationGranted: (locationName: string, coords?: { lat: number; lng: number }, searchRadius?: number) => void;
  currentRadius?: number;
  onRadiusChange?: (radius: number) => void;
  userLocation?: string | null;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  onLocationGranted,
  currentRadius = 25,
  onRadiusChange,
  userLocation
}) => {
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState(userLocation || "");
  const [selectedRadius, setSelectedRadius] = useState<number>(currentRadius);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRequestGeolocation = () => {
    setLoading(true);
    setErrorMsg(null);

    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const cleanName = await getCleanLocationName(latitude, longitude);
        setLoading(false);
        if (onRadiusChange) onRadiusChange(selectedRadius);
        onLocationGranted(cleanName, { lat: latitude, lng: longitude }, selectedRadius);
        onClose();
      },
      (err) => {
        setLoading(false);
        console.warn("Geolocation error:", err);
        setErrorMsg("Location access denied. Please enter your city or ZIP code below.");
        setManualMode(true);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    if (onRadiusChange) onRadiusChange(selectedRadius);
    onLocationGranted(manualInput.trim(), undefined, selectedRadius);
    onClose();
  };

  const handleApplyRadiusAndClose = () => {
    if (onRadiusChange) onRadiusChange(selectedRadius);
    onLocationGranted(userLocation || manualInput.trim() || "San Francisco, CA", undefined, selectedRadius);
    onClose();
  };

  const RADIUS_PRESETS = [
    { value: 5, label: "5 mi" },
    { value: 15, label: "15 mi" },
    { value: 25, label: "25 mi" },
    { value: 50, label: "50 mi" },
    { value: 100, label: "100 mi" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Transparent Click-Outside Overlay to Collapse Popover */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity"
          />

          {/* Top-Right Expandable Location & Search Radius Card */}
          <div className="fixed top-16 right-3 md:right-8 z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.75, y: -25, transformOrigin: "top right" }}
              animate={{ opacity: 1, scale: 1, y: 0, transformOrigin: "top right" }}
              exit={{ opacity: 0, scale: 0.75, y: -25, transformOrigin: "top right" }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="pointer-events-auto bg-white rounded-3xl w-[92vw] max-w-sm shadow-2xl border border-[#d8ebd7] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="relative bg-[#f2f8f2] p-4 border-b border-[#d8ebd7] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[#386633] text-white flex items-center justify-center shadow-xs">
                    <MaterialIcon icon="near_me" size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#18211e]">Location & Deal Radius</h3>
                    <p className="text-[11px] text-[#5e635f] font-medium">
                      {userLocation ? `${userLocation} · ${selectedRadius} mi` : "Set your local deal area"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-white text-[#5e635f] hover:text-[#18211e] transition cursor-pointer"
                  title="Close radius menu"
                >
                  <MaterialIcon icon="close" size={18} />
                </button>
              </div>

              {/* Popover Body */}
              <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Search Radius Controls */}
                <div className="bg-[#f9fbf9] p-3.5 rounded-2xl border border-[#e2f0e1] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-[#18211e]">
                      <MaterialIcon icon="radar" size={16} className="text-[#386633]" />
                      <span>Search Area Radius</span>
                    </div>
                    <span className="text-xs font-extrabold text-white bg-[#386633] px-2.5 py-0.5 rounded-full font-mono shadow-xs">
                      {selectedRadius} miles
                    </span>
                  </div>

                  {/* Range Slider */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min="5"
                      max="150"
                      step="5"
                      value={selectedRadius}
                      onChange={(e) => setSelectedRadius(parseInt(e.target.value, 10))}
                      className="w-full accent-[#386633] cursor-pointer h-2 bg-[#d8ebd7] rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[10px] font-semibold text-[#5e635f]">
                      <span>5 mi (Nearby)</span>
                      <span>50 mi (Outlets)</span>
                      <span>150 mi (Regional)</span>
                    </div>
                  </div>

                  {/* Preset Chips */}
                  <div className="grid grid-cols-5 gap-1 pt-1">
                    {RADIUS_PRESETS.map((preset) => {
                      const isSelected = selectedRadius === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setSelectedRadius(preset.value)}
                          className={`py-1.5 rounded-xl text-[11px] font-bold transition text-center cursor-pointer border ${
                            isSelected
                              ? "bg-[#386633] text-white border-[#386633] shadow-xs"
                              : "bg-white text-[#18211e] border-[#d8ebd7] hover:bg-[#e8f3e8]"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-[#2c5227] leading-tight pt-0.5">
                    {selectedRadius >= 25
                      ? `Searching ${selectedRadius} miles captures deals across regional outlets & major stores.`
                      : `Searching ${selectedRadius} miles strictly focuses on immediate local store stock.`}
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                    {errorMsg}
                  </div>
                )}

                {/* Location Selection Form / GPS Toggle */}
                {manualMode ? (
                  <form onSubmit={handleManualSubmit} className="space-y-2.5">
                    <div>
                      <label className="block text-xs font-bold text-[#18211e] mb-1">City, State or ZIP Code</label>
                      <input
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="e.g. San Francisco, CA or 94103"
                        className="w-full px-3 py-2 rounded-xl border border-[#b0d4af] text-xs focus:outline-none focus:border-[#386633] bg-white text-[#18211e]"
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setManualMode(false)}
                        className="flex-1 py-2 rounded-xl border border-[#b0d4af] text-xs font-bold text-[#18211e] hover:bg-[#e8f3e8] transition cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={!manualInput.trim()}
                        className="flex-1 py-2 rounded-xl bg-[#386633] text-white text-xs font-bold hover:bg-[#2c5227] transition disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        Save Location
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={handleRequestGeolocation}
                      disabled={loading}
                      className="w-full py-2.5 bg-[#386633] hover:bg-[#2c5227] text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <MaterialIcon icon="sync" size={16} className="animate-spin" />
                          <span>Detecting GPS Location...</span>
                        </>
                      ) : (
                        <>
                          <MaterialIcon icon="my_location" size={16} />
                          <span>Use My GPS Location</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setManualMode(true)}
                      className="w-full py-2 bg-white hover:bg-[#f2f8f2] text-[#18211e] border border-[#d8ebd7] font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <MaterialIcon icon="edit_location" size={15} className="text-[#386633]" />
                      <span>{userLocation ? `Change City (${userLocation})` : "Enter City or ZIP"}</span>
                    </button>
                  </div>
                )}

                {/* Apply & Collapse Button */}
                <button
                  type="button"
                  onClick={handleApplyRadiusAndClose}
                  className="w-full py-2.5 bg-[#18211e] hover:bg-[#2c3832] text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <MaterialIcon icon="check_circle" size={16} className="text-emerald-400" />
                  <span>Apply & Collapse to Top Right</span>
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

