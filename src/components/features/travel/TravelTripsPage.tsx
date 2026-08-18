import Logger from "../../../lib/Logger";
import React, { useState, useEffect } from "react";
import { TripRecord, ItineraryEvent, TravelExpense, VoiceNote } from "../../../types";
import { getTrips, getItineraryEvents, getTravelExpenses, getVoiceNotes, createTravelExpense } from "@firebasegen/spresso-connector";

import { TravelHeader } from "./components/TravelHeader";
import { ActiveTripHero } from "./components/ActiveTripHero";
import { BoardingPassList } from "./components/BoardingPassList";
import { VoiceNotesLog } from "./components/VoiceNotesLog";
import { BudgetOverview } from "./components/BudgetOverview";
import { ReceiptScanner } from "./components/ReceiptScanner";
import { QrModal } from "./components/QrModal";

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
  const [newExpenseCategory, setNewExpenseCategory] = useState<string>("Dining");
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [activeQrModalEvent, setActiveQrModalEvent] = useState<ItineraryEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  const tripVoiceNotes = voiceNotes.filter(vn => vn.tripId === activeTripId);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseMerchant || !newExpenseAmount) return;
    try {
      const res = await createTravelExpense({
        tripId: activeTripId,
        amount: parseFloat(newExpenseAmount),
        currency: "USD",
        category: newExpenseCategory as any,
        merchant: newExpenseMerchant
      });
      if (res.data.travelExpense_insert) {
        setExpenses(prev => [{
            id: res.data.travelExpense_insert as any,
            tripId: activeTripId,
            amount: parseFloat(newExpenseAmount),
            currency: "USD",
            category: newExpenseCategory as any,
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

  const toggleRecording = async () => {
    setError("Unable to record voice note. Please check microphone access.");
    setIsRecording(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] transition-colors min-h-screen">
      <TravelHeader trips={trips} activeTripId={activeTripId} setActiveTripId={setActiveTripId} />

      {error && (
        <div className="bg-red-50 text-[#a84a32] text-xs px-6 py-3 border border-red-100 rounded-2xl flex items-center justify-between shadow-sm">
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="cursor-pointer font-bold ml-4">✕</button>
        </div>
      )}

      {currentTrip && <ActiveTripHero currentTrip={currentTrip} onAskAI={onAskAI} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <BoardingPassList tripEvents={tripEvents} setActiveQrModalEvent={setActiveQrModalEvent} />
          <VoiceNotesLog voiceNotes={tripVoiceNotes} isRecording={isRecording} toggleRecording={toggleRecording} />
        </div>

        <div className="space-y-6">
          <BudgetOverview totalSpent={totalSpent} budgetTotal={currentTrip?.budgetTotal || 0} />
          <ReceiptScanner 
            isScanningReceipt={isScanningReceipt}
            handleReceiptUpload={handleReceiptUpload}
            newExpenseMerchant={newExpenseMerchant}
            setNewExpenseMerchant={setNewExpenseMerchant}
            newExpenseAmount={newExpenseAmount}
            setNewExpenseAmount={setNewExpenseAmount}
            newExpenseCategory={newExpenseCategory}
            setNewExpenseCategory={setNewExpenseCategory}
            handleAddExpense={handleAddExpense}
            tripExpenses={tripExpenses}
          />
        </div>
      </div>

      {activeQrModalEvent && <QrModal activeQrModalEvent={activeQrModalEvent} setActiveQrModalEvent={setActiveQrModalEvent} />}
    </div>
  );
};
