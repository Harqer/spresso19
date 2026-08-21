import { useState, useEffect } from 'react';
import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { rtdb } from '../lib/firebase';

export function useGlobalLiveViewers(productId: string) {
  const [viewers, setViewers] = useState<number>(0);

  useEffect(() => {
    if (!productId) return;

    // Track active viewers on the global product node
    const sessionsRef = ref(rtdb, `live_stats/products/${productId}/active_sessions`);
    const mySessionId = Math.random().toString(36).substr(2, 9);
    const myViewerRef = ref(rtdb, `live_stats/products/${productId}/active_sessions/${mySessionId}`);

    // Increment on connect, decrement on disconnect
    set(myViewerRef, true);
    onDisconnect(myViewerRef).remove();

    const unsubscribe = onValue(sessionsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setViewers(Object.keys(val).length);
      } else {
        setViewers(0);
      }
    });

    return () => {
      set(myViewerRef, null); // Clean up on unmount
      unsubscribe();
    };
  }, [productId]);

  return viewers;
}
