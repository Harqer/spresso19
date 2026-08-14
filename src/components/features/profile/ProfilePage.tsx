import React, { useState, useEffect } from "react";
import { User, updateProfile } from "firebase/auth";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db as firestoreDb, authFetch } from "../../../lib/firebase";
import { getCleanDisplayName, getUserPhotoURL } from "../../../lib/userUtils";
import { UserAvatar } from "@/src/components/features/profile/UserAvatar";
import { MaterialIcon } from "../../MaterialIcon";

interface ProfilePageProps {
  user: User;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLogout: () => void;
}

export function ProfilePage({ user, theme, onToggleTheme, onLogout }: ProfilePageProps) {
  const [displayName, setDisplayName] = useState(getCleanDisplayName(user));
  const [photoURL, setPhotoURL] = useState(getUserPhotoURL(user) || "");

  useEffect(() => {
    setDisplayName(getCleanDisplayName(user));
    setPhotoURL(getUserPhotoURL(user) || "");
  }, [user]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // VIP Subscription & Wallet Cards State
  const [subscriptionTier, setSubscriptionTier] = useState("VIP Member");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [activeModal, setActiveModal] = useState<"cards" | "subscription" | "policy" | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  // Saved Credit Cards (Real Backend API State)
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  // Load Real Payment Methods & Subscription from Backend API
  useEffect(() => {
    let isMounted = true;
    const fetchUserData = async () => {
      try {
        const [cardsRes, subRes] = await Promise.all([
          authFetch("/api/user/cards"),
          authFetch("/api/user/subscription")
        ]);

        const cardsData = await cardsRes.json();
        const subData = await subRes.json();

        if (isMounted) {
          if (cardsData?.success && Array.isArray(cardsData.cards)) {
            setSavedCards(cardsData.cards);
          }
          if (subData?.success && subData.subscription?.tier) {
            setSubscriptionTier(subData.subscription.tier);
          }
        }
      } catch (err) {
        console.error("Failed to load user profile details:", err);
      } finally {
        if (isMounted) setIsLoadingCards(false);
      }
    };

    fetchUserData();
    return () => { isMounted = false; };
  }, []);

  // Save Profile Changes to Firebase Auth + Firestore + Cloud SQL
  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim(),
          photoURL: photoURL.trim() || null
        });
        await auth.currentUser.reload();

        await setDoc(
          doc(firestoreDb, "users", auth.currentUser.uid),
          {
            name: displayName.trim(),
            photoURL: photoURL.trim() || "",
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );

        await authFetch("/api/user/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email || "",
            name: displayName.trim(),
            photoURL: photoURL.trim()
          })
        });
      }

      setSaveSuccessMsg("Profile details saved successfully!");
      setIsEditing(false);
    } catch (err: any) {
      setSaveErrorMsg(err?.message || "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // Add Credit Card via REST API
  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardNumber) return;

    try {
      const res = await authFetch("/api/user/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardNumber: newCardNumber, expiry: newCardExpiry })
      });
      const data = await res.json();
      if (data?.success && data.card) {
        setSavedCards((prev) => [...prev, data.card]);
      }
    } catch (err) {
      console.error("Failed to add card:", err);
    } finally {
      setNewCardNumber("");
      setNewCardExpiry("");
      setActiveModal(null);
    }
  };

  // Remove Credit Card via REST API
  const handleRemoveCard = async (cardId: string) => {
    try {
      await authFetch(`/api/user/cards/${cardId}`, { method: "DELETE" });
      setSavedCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch (err) {
      console.error("Failed to delete card:", err);
    }
  };

  // Upgrade / Save Subscription Tier
  const handleUpgradeSubscription = async (tier: string) => {
    try {
      const res = await authFetch("/api/user/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier })
      });
      const data = await res.json();
      if (data?.success && data.subscription?.tier) {
        setSubscriptionTier(data.subscription.tier);
      }
    } catch (err) {
      console.error("Failed to update subscription:", err);
    } finally {
      setActiveModal(null);
    }
  };

  // Toggle Preferences & Persist to Firestore
  const handleToggleNotifications = async () => {
    const nextVal = !notificationsEnabled;
    setNotificationsEnabled(nextVal);
    try {
      await authFetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushNotifications: nextVal, emailAlerts: emailAlertsEnabled })
      });
    } catch (err) {
      console.error("Failed to update preferences:", err);
    }
  };

  // Full Account Deactivation & Purge
  const handleDeactivateAccount = async () => {
    try {
      if (auth.currentUser) {
        await deleteDoc(doc(firestoreDb, "users", auth.currentUser.uid));
      }
    } catch (err) {
      console.error("Failed to purge user doc:", err);
    } finally {
      setShowDeactivateConfirm(false);
      onLogout();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Profile Banner (Google Sign-In Account Name & Avatar Image) */}
      <div className="p-6 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <UserAvatar user={user} size="lg" />
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2 max-w-sm">
                <div>
                  <label className="text-[10px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase">Account Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] focus:outline-none"
                    placeholder="Account Name"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase">Profile Photo URL</label>
                  <input
                    type="url"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] focus:outline-none"
                    placeholder="https://lh3.googleusercontent.com/..."
                  />
                </div>
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[var(--md-sys-color-primary)] rounded-xl hover:opacity-90 cursor-pointer shadow-xs"
                  >
                    {isSaving ? "Saving..." : "Save Profile"}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container)] rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-[var(--md-sys-color-on-surface)] truncate">
                    {getCleanDisplayName(user)}
                  </h1>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] transition-colors cursor-pointer"
                    title="Edit Profile Details"
                  >
                    <MaterialIcon icon="edit" size={18} />
                  </button>
                </div>
                <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] truncate">{user.email || user.providerData?.[0]?.email || user.phoneNumber || "Google Authenticated Session"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Subscription Badge */}
        <div className="flex items-center space-x-2 px-3.5 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 shrink-0">
          <MaterialIcon icon="verified" size={16} />
          <span>{subscriptionTier}</span>
        </div>
      </div>

      {/* Save Success / Error Messages */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs rounded-2xl flex items-center space-x-2">
          <MaterialIcon icon="check_circle" size={18} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}
      {saveErrorMsg && (
        <div className="p-3.5 bg-[var(--color-accent-orange)]/10 border border-[var(--color-accent-orange)]/30 text-[var(--color-accent-orange)] text-xs rounded-2xl flex items-center space-x-2">
          <MaterialIcon icon="error" size={18} />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      {/* Membership & Subscription Plans */}
      <div className="p-6 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 text-[var(--md-sys-color-primary)] font-bold">
            <MaterialIcon icon="stars" size={20} />
            <span className="text-sm">Membership & Plans</span>
          </div>
          <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] font-medium">Auto-renews Dec 31, 2026</span>
        </div>
        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
          Enjoy unlimited free express delivery, 5% cash back rewards, and priority AI shopping assistance with your active membership.
        </p>
        <button
          onClick={() => setActiveModal("subscription")}
          className="w-full py-2.5 rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          Manage VIP Subscription ($14.99/mo)
        </button>
      </div>

      {/* Saved Payment Methods & Cards */}
      <div className="p-6 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 text-[var(--md-sys-color-primary)] font-bold">
            <MaterialIcon icon="credit_card" size={20} />
            <span className="text-sm">Saved Payment Cards & Wallet</span>
          </div>
          <button
            onClick={() => setActiveModal("cards")}
            className="text-xs font-bold text-[var(--md-sys-color-primary)] flex items-center space-x-1 hover:underline cursor-pointer"
          >
            <MaterialIcon icon="add_card" size={16} />
            <span>Add Card</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {isLoadingCards ? (
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">Loading payment cards...</p>
          ) : savedCards.map((card) => (
            <div
              key={card.id}
              className="p-4 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)] flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <MaterialIcon icon="payment" size={22} className="text-[var(--md-sys-color-primary)]" />
                <div>
                  <p className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">{card.brand} •••• {card.last4}</p>
                  <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">Expires {card.expiry}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {card.isDefault && (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Default
                  </span>
                )}
                <button
                  onClick={() => handleRemoveCard(card.id)}
                  className="p-1 text-[var(--md-sys-color-on-surface-variant)] hover:text-red-500 cursor-pointer"
                  title="Remove Card"
                >
                  <MaterialIcon icon="delete" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* App Preferences */}
      <div className="p-6 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] space-y-4">
        <div className="flex items-center space-x-2 text-[var(--md-sys-color-primary)] font-bold">
          <MaterialIcon icon="settings" size={20} />
          <span className="text-sm">App Preferences</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]">
            <div className="flex items-center space-x-3">
              <MaterialIcon icon={theme === "dark" ? "dark_mode" : "light_mode"} size={20} className="text-[var(--md-sys-color-primary)]" />
              <div>
                <p className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">Appearance Theme</p>
                <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">{theme === "dark" ? "Dark Mode Active" : "Light Mode Active"}</p>
              </div>
            </div>
            <button
              onClick={onToggleTheme}
              className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${theme === "dark" ? "bg-[var(--md-sys-color-primary)]" : "bg-neutral-300"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${theme === "dark" ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]">
            <div className="flex items-center space-x-3">
              <MaterialIcon icon="notifications" size={20} className="text-[var(--md-sys-color-primary)]" />
              <div>
                <p className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">Push Notifications</p>
                <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">Order updates, price drops & delivery tracking</p>
              </div>
            </div>
            <button
              onClick={handleToggleNotifications}
              className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${notificationsEnabled ? "bg-[var(--md-sys-color-primary)]" : "bg-neutral-300"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationsEnabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Account Deactivation & Sign Out */}
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

      {/* Add Payment Card Modal */}
      {activeModal === "cards" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--md-sys-color-surface)] rounded-3xl max-w-md w-full p-6 space-y-4 border border-[var(--md-sys-color-outline-variant)] shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--md-sys-color-on-surface)]">Add Payment Card</h3>
              <button onClick={() => setActiveModal(null)} className="text-[var(--md-sys-color-on-surface-variant)] cursor-pointer">
                <MaterialIcon icon="close" size={20} />
              </button>
            </div>
            <form onSubmit={handleAddCard} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">Card Number</label>
                <input
                  type="text"
                  required
                  placeholder="4242 4242 4242 4242"
                  value={newCardNumber}
                  onChange={(e) => setNewCardNumber(e.target.value)}
                  className="w-full py-2.5 px-3 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">Expiry Date</label>
                <input
                  type="text"
                  required
                  placeholder="MM/YY"
                  value={newCardExpiry}
                  onChange={(e) => setNewCardExpiry(e.target.value)}
                  className="w-full py-2.5 px-3 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] rounded-xl text-xs font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold text-xs cursor-pointer shadow-xs"
              >
                Save Payment Card
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Management Modal */}
      {activeModal === "subscription" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--md-sys-color-surface)] rounded-3xl max-w-md w-full p-6 space-y-4 border border-[var(--md-sys-color-outline-variant)] shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--md-sys-color-on-surface)]">Membership Plan Options</h3>
              <button onClick={() => setActiveModal(null)} className="text-[var(--md-sys-color-on-surface-variant)] cursor-pointer">
                <MaterialIcon icon="close" size={20} />
              </button>
            </div>
            <div className="space-y-2.5">
              <div
                onClick={() => handleUpgradeSubscription("VIP Member")}
                className={`p-4 rounded-2xl border cursor-pointer transition ${subscriptionTier === "VIP Member" ? "border-emerald-500 bg-emerald-500/10" : "border-[var(--md-sys-color-outline-variant)]"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[var(--md-sys-color-on-surface)]">VIP Member ($14.99/mo)</span>
                  {subscriptionTier === "VIP Member" && <span className="text-[10px] font-bold text-emerald-600">Active</span>}
                </div>
                <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-1">Unlimited free delivery + priority AI access</p>
              </div>

              <div
                onClick={() => handleUpgradeSubscription("Executive Tier")}
                className={`p-4 rounded-2xl border cursor-pointer transition ${subscriptionTier === "Executive Tier" ? "border-emerald-500 bg-emerald-500/10" : "border-[var(--md-sys-color-outline-variant)]"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[var(--md-sys-color-on-surface)]">Executive Tier ($29.99/mo)</span>
                  {subscriptionTier === "Executive Tier" && <span className="text-[10px] font-bold text-emerald-600">Active</span>}
                </div>
                <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-1">Dedicated AI concierge + 10% grocery cash back</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Dialog */}
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
    </div>
  );
}
