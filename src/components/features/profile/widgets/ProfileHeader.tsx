import React, { useState, useEffect } from "react";
import { User, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db as firestoreDb } from "../../../../lib/firebase";
import { upsertUserProfile } from "@firebasegen/spresso-connector";
import { getCleanDisplayName, getUserPhotoURL } from "../../../../lib/userUtils";
import { UserAvatar } from "../UserAvatar";
import { MaterialIcon } from "../../../MaterialIcon";

interface ProfileHeaderProps {
  user: User;
  subscriptionTier: string;
}

export function ProfileHeader({ user, subscriptionTier }: ProfileHeaderProps) {
  const [displayName, setDisplayName] = useState(getCleanDisplayName(user));
  const [photoURL, setPhotoURL] = useState(getUserPhotoURL(user) || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(getCleanDisplayName(user));
    setPhotoURL(getUserPhotoURL(user) || "");
  }, [user]);

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

        await upsertUserProfile({
            email: user.email || "",
            displayName: displayName.trim(),
            avatarUrl: photoURL.trim()
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

  return (
    <div className="space-y-4">
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

        <div className="flex items-center space-x-2 px-3.5 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 shrink-0">
          <MaterialIcon icon="verified" size={16} />
          <span>{subscriptionTier}</span>
        </div>
      </div>

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
    </div>
  );
}
