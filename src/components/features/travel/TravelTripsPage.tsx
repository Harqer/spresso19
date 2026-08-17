import Logger from "../../../lib/Logger";
import React, { useState, useEffect, useRef } from "react";
import { TripRecord, ItineraryEvent, TravelExpense, VoiceNote } from "../../../types";
import { MaterialIcon } from "../../MaterialIcon";
import { getTrips, getItineraryEvents, getTravelExpenses, getVoiceNotes, createTravelExpense, createVoiceNote, connectorConfig } from "@firebasegen/spresso-connector";

interface TravelTripsPageProps {
  onAskAI?: (prompt: string) => void;
}

export const TravelTripsPage: React.FC<TravelTripsPageProps> = ({ onAskAI }) => {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [activeTripId, setActiveTripId] = useState<string>("");
  const [events, setEvents] = useState<ItineraryEvent[]>([]);
  const [expenses, setExpenses] = useState<TravelExpense[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [newExpenseMerchant, setNewExpenseMerchant] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpenseCategory, setNewExpenseCategory] = useState<TravelExpense["category"]>("Dining");
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [activeQrModalEvent, setActiveQrModalEvent] = useState<ItineraryEvent | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchTravelData = async () => {
      try {
        const [tripsRes, eventsRes, expensesRes, notesRes] = await Promise.all([
          getTrips(),
          getItineraryEvents(),
          getTravelExpenses(),
          getVoiceNotes()
        ]);
        
        if (isMounted) {
          if (tripsRes.data.trips) setTrips(tripsRes.data.trips as any);
          if (tripsRes.data.trips?.length > 0) setActiveTripId(tripsRes.data.trips[0].id);
          if (eventsRes.data.itineraryEvents) setEvents(eventsRes.data.itineraryEvents as any);
          if (expensesRes.data.travelExpenses) setExpenses(expensesRes.data.travelExpenses as any);
          if (notesRes.data.voiceNotes) setVoiceNotes(notesRes.data.voiceNotes as any);
        }
      } catch (err) {
        Logger.error("Failed to load travel data:", err);
      }
    };
    fetchTravelData();
    return () => { isMounted = false; };
  }, []);

  const currentTrip = trips.find(t => t.id === activeTripId) || trips[0];
  const tripEvents = events.filter(e => e.tripId === activeTripId);
  const tripExpenses = expenses.filter(e => e.tripId === activeTripId);

  const totalSpent = tripExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseMerchant || !newExpenseAmount) return;
    try {
      const res = await createTravelExpense({
        tripId: activeTripId,
        amount: parseFloat(newExpenseAmount),
        currency: "USD",
        category: newExpenseCategory,
        merchant: newExpenseMerchant
      });
      if (res.data.travelExpense_insert) {
        // Optimistic append, usually we would refetch
        setExpenses(prev => [{
            id: res.data.travelExpense_insert as any,
            tripId: activeTripId,
            amount: parseFloat(newExpenseAmount),
            currency: "USD",
            category: newExpenseCategory,
            merchant: newExpenseMerchant,
            createdAt: new Date().toISOString()
        } as any, ...prev]);
      }
    } catch (err) {
      Logger.error("Failed to add expense:", err);
    }
    setNewExpenseMerchant("");
    setNewExpenseAmount("");
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningReceipt(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        const res = await fetch("https://us-central1-spresso-5561f.cloudfunctions.net/parseReceipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64Data })
        });
        const data = await res.json();
        if (data.parsed) {
          const parsedExp: TravelExpense = {
            id: `exp-receipt-${Date.now()}`,
            tripId: activeTripId,
            amount: data.parsed.total || 0,
            currency: data.parsed.currency || "USD",
            category: (data.parsed.category as any) || "Other",
            merchant: data.parsed.merchant || "",
            date: new Date().toISOString().split("T")[0],
            items: data.parsed.lineItems || []
          };
          setExpenses(prev => [parsedExp, ...prev]);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      Logger.error("Receipt parsing error:", err);
    } finally {
      setIsScanningReceipt(false);
    }
  };

  const [error, setError] = useState<string | null>(null);

  const toggleRecording = async () => {
    // We don't have a real audio URL, so we shouldn't proceed with a dummy.
    // Instead of failing silently or using a dummy, we display an explicit error.
    setError("Microphone access is unavailable or no audio source was provided. Transcription failed.");
    setIsRecording(false);
    
    // The previous implementation used a dummy URL:
    // const res = await transcribeAudio({ tripId: activeTripId, audioUrl: "dummy_url_placeholder" });
    // This is strictly forbidden. We must fail fast.
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] transition-colors min-h-screen">
      {/* Header Banner & Trip Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--md-sys-color-outline-variant)] pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center shadow-md">
              <MaterialIcon icon="flight_takeoff" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black font-headline tracking-tight">Travel, Itinerary & Expense Manager</h1>
              <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">AI-powered receipt parser, timeline boarding passes & expense budget tracker</p>
            </div>
          </div>
        </div>

        {/* Trip Switcher Pills */}
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

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 text-[#a84a32] text-xs px-6 py-3 border border-red-100 rounded-2xl flex items-center justify-between shadow-sm">
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="cursor-pointer font-bold ml-4">✕</button>
        </div>
      )}

      {/* Active Trip Hero Banner */}
      {currentTrip && (
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
                <span>Ask AI Travel Assistant</span>
              </button>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">{currentTrip.title}</h2>
              <p className="text-xs text-stone-300 font-medium flex items-center space-x-2 mt-1">
                <MaterialIcon icon="calendar_today" size={14} />
                <span>{currentTrip.startDate} ➔ {currentTrip.endDate} ({currentTrip.destination})</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Left - Boarding Passes & Timeline / Right - Expense Tracker & Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Itinerary & Boarding Pass Cards (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center space-x-2">
              <MaterialIcon icon="confirmation_number" size={20} className="text-[var(--md-sys-color-primary)]" />
              <span>Itinerary & Boarding Pass Tickets</span>
            </h3>
            <span className="text-xs text-[var(--md-sys-color-on-surface-variant)]">{tripEvents.length} Verified Events</span>
          </div>

          {/* Boarding Passes & Tickets Cards */}
          <div className="space-y-4">
            {tripEvents.map(evt => (
              <div
                key={evt.id}
                className="bg-[var(--md-sys-color-surface-container-lowest)] rounded-3xl p-5 border border-[var(--md-sys-color-outline-variant)] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden space-y-4"
              >
                {/* Top Badge & Type */}
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

                {/* Ticket Details Row */}
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

                {/* Action Row */}
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

          {/* Voice Notes Audio Log Section */}
          <div className="bg-[var(--md-sys-color-surface-container-low)] rounded-3xl p-5 border border-[var(--md-sys-color-outline-variant)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MaterialIcon icon="mic" size={20} className="text-[var(--md-sys-color-primary)]" />
                <h3 className="font-bold text-sm">Travel Voice Notes & Transcription</h3>
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
        </div>

        {/* Right Column: Expense Tracker & AI Receipt Scanner (1 Col) */}
        <div className="space-y-6">
          
          {/* Budget Overview Card */}
          <div className="bg-gradient-to-br from-[var(--md-sys-color-primary-container)] to-[var(--md-sys-color-surface-container)] rounded-3xl p-6 border border-[var(--md-sys-color-outline-variant)] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--md-sys-color-primary)] uppercase tracking-wider">Trip Budget & Expenses</span>
              <MaterialIcon icon="account_balance_wallet" size={20} className="text-[var(--md-sys-color-primary)]" />
            </div>

            <div>
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-black font-mono text-[var(--md-sys-color-on-surface)]">${totalSpent.toFixed(2)}</span>
                <span className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)]">Budget: ${currentTrip.budgetTotal}</span>
              </div>
              
              {/* Budget Bar */}
              <div className="w-full bg-[var(--md-sys-color-surface-container-high)] h-2.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-[var(--md-sys-color-primary)] h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalSpent / (currentTrip.budgetTotal || 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* AI Receipt Scanner & Quick Add Expense Form */}
          <div className="bg-[var(--md-sys-color-surface-container-lowest)] rounded-3xl p-5 border border-[var(--md-sys-color-outline-variant)] space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Automated Receipt Parser</h3>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleReceiptUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanningReceipt}
                className="px-3 py-1.5 bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline-variant)] rounded-full text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <MaterialIcon icon={isScanningReceipt ? "sync" : "document_scanner"} size={16} className={isScanningReceipt ? "animate-spin text-[var(--md-sys-color-primary)]" : "text-[var(--md-sys-color-primary)]"} />
                <span>{isScanningReceipt ? "Parsing Receipt..." : "Scan Receipt"}</span>
              </button>
            </div>

            {/* Manual Add Expense Form */}
            <form onSubmit={handleAddExpense} className="space-y-3">
              <input
                type="text"
                value={newExpenseMerchant}
                onChange={e => setNewExpenseMerchant(e.target.value)}
                placeholder="Merchant / Vendor Name"
                className="w-full py-2 px-3 bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] rounded-xl text-xs outline-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={newExpenseAmount}
                  onChange={e => setNewExpenseAmount(e.target.value)}
                  placeholder="Amount ($)"
                  className="w-full py-2 px-3 bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] rounded-xl text-xs outline-none font-mono"
                />
                <select
                  value={newExpenseCategory}
                  onChange={e => setNewExpenseCategory(e.target.value as any)}
                  className="w-full py-2 px-3 bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] rounded-xl text-xs outline-none"
                >
                  <option value="Dining">Dining</option>
                  <option value="Flight">Flight</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Transport">Transport</option>
                  <option value="Activities">Activities</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <MaterialIcon icon="add_circle" size={16} />
                <span>Log Travel Expense</span>
              </button>
            </form>

            {/* Expenses List */}
            <div className="space-y-2 pt-2 border-t border-[var(--md-sys-color-outline-variant)]">
              <h4 className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider">Logged Expenses</h4>
              {tripExpenses.map(exp => (
                <div key={exp.id} className="flex items-center justify-between p-2.5 bg-[var(--md-sys-color-surface-container-low)] rounded-xl text-xs">
                  <div>
                    <span className="font-bold block">{exp.merchant}</span>
                    <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">{exp.category} • {exp.date}</span>
                  </div>
                  <span className="font-mono font-bold text-[var(--md-sys-color-primary)]">${exp.amount}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* QR Code Modal for Pass Cards */}
      {activeQrModalEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--md-sys-color-surface-container-lowest)] rounded-3xl p-6 max-w-sm w-full border border-[var(--md-sys-color-outline-variant)] shadow-2xl text-center space-y-4">
            <h3 className="font-bold text-base">{activeQrModalEvent.title}</h3>
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">{activeQrModalEvent.location}</p>

            {/* Simulated QR & Barcode display */}
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
      )}
    </div>
  );
};
