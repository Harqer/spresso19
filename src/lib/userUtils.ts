/**
 * Authentic Firebase & Google Profile Extractor.
 * Driven 100% in-memory by Firebase Auth SDK (No localStorage clutter, no fake name checking).
 */
export function getCleanDisplayName(user?: any | null): string {
  if (!user) return "";

  // 1. Direct Display Name from Firebase Auth or Google OAuth Claim
  const directName = user.displayName || user.name || user.providerData?.[0]?.displayName;
  if (directName && typeof directName === "string" && directName.trim().length > 0) {
    return directName.trim();
  }

  // 2. Formatted Email Address Prefix (e.g. "alex.rivera@gmail.com" -> "Alex Rivera")
  const rawEmail = user.email || user.providerData?.[0]?.email;
  if (rawEmail && typeof rawEmail === "string" && rawEmail.includes("@")) {
    const prefix = rawEmail.split("@")[0].trim();
    if (prefix) {
      return prefix
        .replace(/[._\-]+/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
  }

  // 3. Phone Number
  const rawPhone = user.phoneNumber || user.providerData?.[0]?.phoneNumber;
  if (rawPhone && typeof rawPhone === "string" && rawPhone.trim().length > 0) {
    return rawPhone.trim();
  }

  return "";
}

/**
 * Extracts Google profile photo URL directly from Firebase Auth user root or providerData[0].
 */
export function getUserPhotoURL(user?: any | null): string | null {
  if (!user) return null;
  return user.photoURL || user.avatarUrl || user.providerData?.[0]?.photoURL || null;
}
