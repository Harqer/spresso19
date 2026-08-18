import Logger from "../../../../lib/Logger";
import React, { useState } from "react";
import { MaterialIcon } from "../../../MaterialIcon";
import { doc, deleteDoc } from "firebase/firestore";
import { auth, db as firestoreDb } from "../../../../lib/firebase";

interface AccountDeactivationWidgetProps {
  onLogout: () => void;
}

export function AccountDeactivationWidget({ onLogout }: AccountDeactivationWidgetProps) {
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const handleDeactivateAccount = async () => {
    try {
      if (auth.currentUser) {
        await deleteDoc(doc(firestoreDb, "users", auth.currentUser.uid));
      }
    } catch (err) {
      Logger.error("Failed to purge user doc:", err);
    } finally {
      setShowDeactivateConfirm(false);
      onLogout();
    }
  };

  return (
    <>
      <div className="p-6 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] space-y-3">
        <button
          onClick={onLogout}
          className="w-full py-3 rounded-2xl bg-[var(--md-sys-color-on-surface)] text-[var(--md-sys-color-surface)] font-bold text-xs flex items-center justify-center space-x-2 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          <MaterialIcon icon="logout" size={18} />
          <span>Sign Out</span>
        </button>

        <button
          onClick={() => setShowDeactivateConfirm(true)}
          className="w-full py-3 rounded-2xl border border-red-500/40 text-red-600 dark:text-red-400 font-bold text-xs flex items-center justify-center space-x-2 hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <MaterialIcon icon="delete_forever" size={18} />
          <span>Deactivate Account</span>
        </button>
      </div>

      {showDeactivateConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--md-sys-color-surface)] rounded-3xl max-w-md w-full p-6 space-y-4 border border-[var(--md-sys-color-outline-variant)] shadow-2xl">
            <h3 className="text-base font-bold text-red-600 dark:text-red-400">Deactivate Account?</h3>
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
              This action will permanently purge your saved cards, delivery addresses, and AI shopping history from the backend database.
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowDeactivateConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--md-sys-color-outline)] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivateAccount}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer"
              >
                Deactivate Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
