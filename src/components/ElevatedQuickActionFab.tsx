import React, { useState, useEffect } from "react";
import { MaterialIcon } from "./MaterialIcon";
import { ProductItem } from "../types";
import { authFetch } from "../lib/firebase";

interface ElevatedQuickActionFabProps {
  product: ProductItem | any;
  onSelectTryOn?: (product: any) => void;
  onOpenLens?: (product: any) => void;
  positionClassName?: string;
  isLikedInitial?: boolean;
  isBookmarkedInitial?: boolean;
  onToggleLikeCallback?: (product: any, isLiked: boolean) => void;
  onToggleBookmarkCallback?: (product: any, isBookmarked: boolean) => void;
}

export const ElevatedQuickActionFab: React.FC<ElevatedQuickActionFabProps> = ({
  product,
  onSelectTryOn,
  onOpenLens,
  positionClassName = "bottom-6 right-6",
  isLikedInitial,
  isBookmarkedInitial,
  onToggleLikeCallback,
  onToggleBookmarkCallback
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize initial state with backend if not provided
  useEffect(() => {
    if (!product) return;
    const prodId = product.id || product.sku;

    if (isLikedInitial !== undefined) {
      setIsLiked(isLikedInitial);
    } else {
      authFetch("/api/user/likes").then(res => res.json()).then(data => {
        if (data.likes) {
          const found = data.likes.some((item: any) => item.productId === prodId);
          setIsLiked(found);
        }
      }).catch(console.error);
    }

    if (isBookmarkedInitial !== undefined) {
      setIsBookmarked(isBookmarkedInitial);
    } else {
      authFetch("/api/user/bookmarks").then(res => res.json()).then(data => {
        if (data.bookmarks) {
          const found = data.bookmarks.some((item: any) => item.productId === prodId);
          setIsBookmarked(found);
        }
      }).catch(console.error);
    }
  }, [product, isLikedInitial, isBookmarkedInitial]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product) return;
    const prodId = product.id || product.sku;
    const newLiked = !isLiked;
    setIsLiked(newLiked);

    if (newLiked) {
      showToast("Added to Liked Items in Wardrobe ❤️");
    } else {
      showToast("Removed from Liked Items");
    }

    authFetch("/api/user/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: prodId, action: newLiked ? "add" : "remove" })
    }).catch(console.error);

    if (onToggleLikeCallback) {
      onToggleLikeCallback(product, newLiked);
    }
  };

  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product) return;
    const prodId = product.id || product.sku;
    const newBM = !isBookmarked;
    setIsBookmarked(newBM);

    if (newBM) {
      showToast("Saved to Bookmarked Wardrobe");
    } else {
      showToast("Removed from Bookmarks");
    }

    authFetch("/api/user/bookmark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: prodId, action: newBM ? "add" : "remove" })
    }).catch(console.error);

    if (onToggleBookmarkCallback) {
      onToggleBookmarkCallback(product, newBM);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product) return;
    const shareUrl = window.location.href;
    const shareData = {
      title: product.name || "Spresso Product",
      text: `Check out ${product.name} on Spresso!`,
      url: shareUrl
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      navigator.share(shareData).catch(() => {
        navigator.clipboard.writeText(shareUrl);
        showToast("Link copied to clipboard 🔗");
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      showToast("Product link copied to clipboard 🔗");
    }
  };

  const handleAnimateTryOn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectTryOn && product) {
      onSelectTryOn(product);
      showToast("Launching Virtual Avatar Try-On 🎬");
    } else if (onOpenLens && product) {
      onOpenLens(product);
    }
  };

  if (!product) return null;

  return (
    <div className={`fixed ${positionClassName} z-50 flex flex-col items-end select-none`}>
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="mb-3 px-4 py-2 bg-[#191d16] dark:bg-[#282b24] text-[#e1e4d9] text-xs font-bold font-mono rounded-2xl shadow-2xl border border-[#a9d291]/30 flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <MaterialIcon icon="check_circle" size={16} className="text-[#a9d291]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Expanded Actions Stack */}
      <div
        className={`flex flex-col items-end space-y-2.5 transition-all duration-300 transform ${
          isExpanded ? "opacity-100 scale-100 translate-y-0 pointer-events-auto mb-3" : "opacity-0 scale-90 translate-y-4 pointer-events-none h-0 overflow-hidden"
        }`}
      >
        {/* 1. Like Action Button */}
        <button
          onClick={handleToggleLike}
          className={`group flex items-center space-x-2 px-4 py-2.5 rounded-full shadow-lg border transition-all duration-200 hover:scale-105 cursor-pointer ${
            isLiked
              ? "bg-rose-500 text-white border-rose-400 shadow-rose-500/30"
              : "bg-white dark:bg-[#191d16] text-rose-500 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          }`}
          title={isLiked ? "Unlike product" : "Like product"}
        >
          <span className="text-xs font-bold font-mono text-slate-800 dark:text-[#e1e4d9] group-hover:inline">
            {isLiked ? "Liked" : "Like"}
          </span>
          <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center shrink-0">
            <MaterialIcon icon={isLiked ? "favorite" : "favorite_border"} size={18} className="text-rose-500" />
          </div>
        </button>

        {/* 2. Bookmark Wardrobe Action Button */}
        <button
          onClick={handleToggleBookmark}
          className={`group flex items-center space-x-2 px-4 py-2.5 rounded-full shadow-lg border transition-all duration-200 hover:scale-105 cursor-pointer ${
            isBookmarked
              ? "bg-[#446732] dark:bg-[#a9d291] text-white dark:text-[#173807] border-[#446732] dark:border-[#a9d291] shadow-emerald-600/30"
              : "bg-white dark:bg-[#191d16] text-[#446732] dark:text-[#a9d291] border-[#dfe4d7] dark:border-[#43483e] hover:bg-[#f2f5ea] dark:hover:bg-[#282b24]"
          }`}
          title={isBookmarked ? "Saved in Wardrobe" : "Save to Wardrobe"}
        >
          <span className="text-xs font-bold font-mono text-slate-800 dark:text-[#e1e4d9] group-hover:inline">
            {isBookmarked ? "Bookmarked" : "Bookmark"}
          </span>
          <div className="w-7 h-7 rounded-full bg-[#e8f3e8] dark:bg-[#282b24] flex items-center justify-center shrink-0">
            <MaterialIcon icon={isBookmarked ? "bookmark" : "bookmark_add"} size={18} className="text-[#446732] dark:text-[#a9d291]" />
          </div>
        </button>

        {/* 3. Share Action Button */}
        <button
          onClick={handleShare}
          className="group flex items-center space-x-2 px-4 py-2.5 bg-white dark:bg-[#191d16] text-[#191d16] dark:text-[#e1e4d9] border border-[#dfe4d7] dark:border-[#43483e] hover:bg-stone-50 dark:hover:bg-[#282b24] rounded-full shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer"
          title="Share Product Link"
        >
          <span className="text-xs font-bold font-mono text-slate-800 dark:text-[#e1e4d9]">Share</span>
          <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center shrink-0">
            <MaterialIcon icon="share" size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
        </button>

        {/* 4. Animate / Try-On Action Button */}
        <button
          onClick={handleAnimateTryOn}
          className="group flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#446732] to-[#2d4f1c] dark:from-[#a9d291] dark:to-[#759b60] text-white dark:text-[#173807] border border-[#a9d291]/40 rounded-full shadow-xl hover:shadow-emerald-500/20 transition-all duration-200 hover:scale-105 cursor-pointer"
          title="Animate & Try-On Avatar"
        >
          <span className="text-xs font-bold font-mono uppercase tracking-wider">Animate 360°</span>
          <div className="w-7 h-7 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center shrink-0">
            <MaterialIcon icon="animation" size={18} className="text-white dark:text-[#173807]" />
          </div>
        </button>
      </div>

      {/* Primary Jetpack Compose Material 3 Extended / Elevated FAB */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center space-x-3 px-5 py-3.5 rounded-full shadow-2xl border transition-all duration-300 transform active:scale-95 cursor-pointer ${
          isExpanded
            ? "bg-[#191d16] dark:bg-[#2d4f1c] text-white dark:text-[#c5efab] border-[#a9d291]/50 ring-4 ring-[#a9d291]/20"
            : "bg-white dark:bg-[#191d16] hover:bg-[#f2f5ea] dark:hover:bg-[#282b24] text-[#191d16] dark:text-[#e1e4d9] border-[#446732] dark:border-[#a9d291] hover:shadow-[0_20px_40px_rgba(68,103,50,0.25)]"
        }`}
        title="Widget Quick Actions (Like, Bookmark, Share, Animate)"
      >
        <div className={`p-2 rounded-full transition-transform duration-300 ${isExpanded ? "rotate-45 bg-rose-500/20 text-rose-300" : "bg-[#e8f3e8] dark:bg-[#282b24] text-[#446732] dark:text-[#a9d291]"}`}>
          <MaterialIcon icon={isExpanded ? "close" : "add"} size={22} />
        </div>
        
        <div className="flex flex-col text-left pr-1">
          <span className="text-xs font-bold tracking-tight font-headline">Lens Quick Actions</span>
          <span className="text-[10px] text-[#43483e] dark:text-[#c3c8bb] font-mono leading-none">
            {isExpanded ? "Tap to close" : "Like • Bookmark • Share • Try-On"}
          </span>
        </div>

        {/* Dynamic Badge Pulse Dot */}
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a9d291] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-[#446732] dark:bg-[#a9d291]"></span>
        </span>
      </button>
    </div>
  );
};
