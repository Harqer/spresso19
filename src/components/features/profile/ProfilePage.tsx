import Logger from "../../../lib/Logger";
import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { getUserSubscription } from "@firebasegen/spresso-connector";

import { ProfileHeader } from "./widgets/ProfileHeader";
import { MembershipPlansWidget } from "./widgets/MembershipPlansWidget";
import { PaymentCardsWidget } from "./widgets/PaymentCardsWidget";
import { AppPreferencesWidget } from "./widgets/AppPreferencesWidget";
import { AccountDeactivationWidget } from "./widgets/AccountDeactivationWidget";
import { SubscriptionModal } from "./dialogs/SubscriptionModal";

interface ProfilePageProps {
  user: User;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLogout: () => void;
}

export function ProfilePage({ user, theme, onToggleTheme, onLogout }: ProfilePageProps) {
  const [subscriptionTier, setSubscriptionTier] = useState("VIP Member");
  const [autoRenewDate, setAutoRenewDate] = useState("Loading...");
  const [vipPrice] = useState("$14.99/mo");
  const [execPrice] = useState("$29.99/mo");
  
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchUserData = async () => {
      try {
        const subRes = await getUserSubscription();
        if (isMounted) {
          if (subRes.data.userSubscriptions && subRes.data.userSubscriptions.length > 0) {
            const sub = subRes.data.userSubscriptions[0];
            if (sub.tier) setSubscriptionTier(sub.tier as any);
            if (sub.currentPeriodEnd) setAutoRenewDate(sub.currentPeriodEnd as any);
          }
        }
      } catch (err) {
        Logger.error("Failed to load user subscription:", err);
      }
    };
    fetchUserData();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <ProfileHeader 
        user={user} 
        subscriptionTier={subscriptionTier} 
      />

      <MembershipPlansWidget 
        subscriptionTier={subscriptionTier}
        autoRenewDate={autoRenewDate}
        vipPrice={vipPrice}
        execPrice={execPrice}
        onManage={() => setShowSubscriptionModal(true)}
      />

      <PaymentCardsWidget />

      <AppPreferencesWidget 
        theme={theme} 
        onToggleTheme={onToggleTheme} 
      />

      <AccountDeactivationWidget 
        onLogout={onLogout} 
      />

      {showSubscriptionModal && (
        <SubscriptionModal 
          onClose={() => setShowSubscriptionModal(false)}
          subscriptionTier={subscriptionTier}
          vipPrice={vipPrice}
          execPrice={execPrice}
        />
      )}
    </div>
  );
}
