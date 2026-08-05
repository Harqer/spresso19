import React, { useState, useEffect, useMemo } from "react";
import { MaterialIcon } from "./MaterialIcon";
import { ProductItem, OrderRecord } from "../types";
import { PullToRefreshBox } from "./PullToRefreshBox";

export type BackNavigationBehavior =
  | "PopUntilScaffoldValueChange"
  | "PopUntilContentChange"
  | "PopUntilCurrentDestinationChange"
  | "PopLatest";

export type ScaffoldRole = "List" | "Detail" | "Extra";
export type LayoutMode = "ListDetail" | "Feed" | "SupportingPane";

export interface NavigableListDetailPaneScaffoldProps {
  products?: ProductItem[];
  orders?: OrderRecord[];
  onSelectTryOn?: (product: ProductItem) => void;
  onAddToCart?: (product: ProductItem) => void;
  onAskAI?: (text: string, image?: string | null) => void;
}

export const NavigableListDetailPaneScaffold: React.FC<NavigableListDetailPaneScaffoldProps> = ({
  products = [],
  orders = [],
  onSelectTryOn,
  onAddToCart,
  onAskAI
}) => {
  // Navigation & Layout State
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("ListDetail");
  const [backBehavior, setBackBehavior] = useState<BackNavigationBehavior>("PopUntilScaffoldValueChange");
  
  // Selection / Backstack State
  const [selectedProductId, setSelectedProductId] = useState<string | null>(products[0]?.id || null);
  const [backStack, setBackStack] = useState<string[]>([]);
  const [currentRole, setCurrentRole] = useState<ScaffoldRole>("List");
  const [showExtraPane, setShowExtraPane] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setIsRefreshing(false);
  };

  // Window size tracking for adaptive breakpoint
  const [isLargeScreen, setIsLargeScreen] = useState<boolean>(() => typeof window !== "undefined" && window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = filterCategory === "ALL" || p.category === filterCategory;
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, filterCategory, searchQuery]);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || products[0] || null;
  }, [products, selectedProductId]);

  // Navigate to Detail Pane
  const navigateToDetail = (productId: string) => {
    if (selectedProductId) {
      setBackStack(prev => [...prev, selectedProductId]);
    }
    setSelectedProductId(productId);
    setCurrentRole("Detail");
  };

  // Back Navigation Handler according to BackNavigationBehavior
  const handleNavigateBack = () => {
    if (backBehavior === "PopUntilScaffoldValueChange") {
      // Return to List view on compact screens
      setCurrentRole("List");
    } else if (backBehavior === "PopUntilContentChange" || backBehavior === "PopLatest") {
      if (backStack.length > 0) {
        const previousId = backStack[backStack.length - 1];
        setBackStack(prev => prev.slice(0, -1));
        setSelectedProductId(previousId);
      } else {
        setCurrentRole("List");
      }
    } else if (backBehavior === "PopUntilCurrentDestinationChange") {
      setCurrentRole("List");
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-[#f8faf7] dark:bg-[#121510] text-[#191d16] dark:text-[#e1e4d9] p-3 sm:p-6 space-y-4">
      {/* Top Adaptive Scaffold Control Bar */}
      <div className="bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#446732]/10 dark:bg-[#a9d291]/20 text-[#446732] dark:text-[#a9d291] flex items-center justify-center">
              <MaterialIcon icon="view_quilt" size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold font-serif text-[#191d16] dark:text-[#e1e4d9]">
                  NavigableListDetailPaneScaffold
                </h2>
                <span className="px-2 py-0.5 bg-[#446732]/15 dark:bg-[#a9d291]/20 text-[#2d4f1c] dark:text-[#c5efab] text-[10px] font-mono font-semibold rounded-md">
                  Material 3 Adaptive
                </span>
              </div>
              <p className="text-xs text-[#43483e] dark:text-[#c3c8bb] mt-0.5">
                Canonical multi-pane layout architecture with adaptive window size class detection
              </p>
            </div>
          </div>

          {/* Screen Size Badge & Mode Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 px-3 py-1.5 bg-[#f2f5ea] dark:bg-[#282b24] border border-[#dfe4d7] dark:border-[#43483e] rounded-xl text-xs font-mono font-medium">
              <MaterialIcon icon={isLargeScreen ? "desktop_windows" : "smartphone"} size={16} className="text-[#446732] dark:text-[#a9d291]" />
              <span>{isLargeScreen ? "Expanded Window (2 Panes)" : "Compact Window (1 Pane)"}</span>
            </div>

            {/* Layout Pattern Buttons */}
            <div className="flex items-center bg-[#f2f5ea] dark:bg-[#282b24] p-1 rounded-xl border border-[#dfe4d7] dark:border-[#43483e]">
              <button
                onClick={() => setLayoutMode("ListDetail")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1 ${
                  layoutMode === "ListDetail"
                    ? "bg-[#446732] dark:bg-[#a9d291] text-white dark:text-[#173807] shadow-2xs"
                    : "text-[#43483e] dark:text-[#c3c8bb] hover:text-[#191d16] dark:hover:text-[#e1e4d9]"
                }`}
              >
                <MaterialIcon icon="view_sidebar" size={15} />
                <span>List-Detail</span>
              </button>

              <button
                onClick={() => setLayoutMode("Feed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1 ${
                  layoutMode === "Feed"
                    ? "bg-[#446732] dark:bg-[#a9d291] text-white dark:text-[#173807] shadow-2xs"
                    : "text-[#43483e] dark:text-[#c3c8bb] hover:text-[#191d16] dark:hover:text-[#e1e4d9]"
                }`}
              >
                <MaterialIcon icon="grid_view" size={15} />
                <span>Feed Grid</span>
              </button>

              <button
                onClick={() => setLayoutMode("SupportingPane")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1 ${
                  layoutMode === "SupportingPane"
                    ? "bg-[#446732] dark:bg-[#a9d291] text-white dark:text-[#173807] shadow-2xs"
                    : "text-[#43483e] dark:text-[#c3c8bb] hover:text-[#191d16] dark:hover:text-[#e1e4d9]"
                }`}
              >
                <MaterialIcon icon="vertical_split" size={15} />
                <span>Supporting Pane</span>
              </button>
            </div>
          </div>
        </div>

        {/* Back Navigation Behavior Settings */}
        {layoutMode === "ListDetail" && (
          <div className="pt-2 border-t border-[#dfe4d7] dark:border-[#43483e] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2 text-[#43483e] dark:text-[#c3c8bb]">
              <MaterialIcon icon="settings_backup_restore" size={16} className="text-[#446732] dark:text-[#a9d291]" />
              <span className="font-semibold">Back Navigation Behavior:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  "PopUntilScaffoldValueChange",
                  "PopUntilContentChange",
                  "PopUntilCurrentDestinationChange",
                  "PopLatest",
                ] as BackNavigationBehavior[]
              ).map(behavior => (
                <button
                  key={behavior}
                  onClick={() => setBackBehavior(behavior)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition cursor-pointer border ${
                    backBehavior === behavior
                      ? "bg-[#446732]/10 dark:bg-[#a9d291]/20 text-[#2d4f1c] dark:text-[#c5efab] border-[#446732] dark:border-[#a9d291] font-bold"
                      : "bg-white dark:bg-[#191d16] text-[#43483e] dark:text-[#c3c8bb] border-[#dfe4d7] dark:border-[#43483e] hover:border-[#446732]"
                  }`}
                >
                  {behavior}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Adaptive Layout Container */}
      {layoutMode === "ListDetail" && (
        <div className="w-full flex flex-col md:flex-row gap-4 items-start relative min-h-[600px]">
          {/* LIST PANE */}
          <div
            className={`w-full md:w-[380px] lg:w-[420px] shrink-0 bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-2xl p-4 shadow-2xs space-y-3 transition-all duration-300 ${
              !isLargeScreen && currentRole === "Detail" ? "hidden" : "block"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-serif text-[#191d16] dark:text-[#e1e4d9] flex items-center space-x-1.5">
                <MaterialIcon icon="format_list_bulleted" size={18} className="text-[#446732] dark:text-[#a9d291]" />
                <span>List Pane ({filteredProducts.length})</span>
              </h3>
              <span className="text-[11px] font-mono text-[#43483e] dark:text-[#c3c8bb]">
                Role: List
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search catalog items..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#f2f5ea] dark:bg-[#282b24] border border-[#dfe4d7] dark:border-[#43483e] rounded-xl text-xs focus:outline-none focus:border-[#446732] dark:focus:border-[#a9d291]"
              />
              <MaterialIcon icon="search" size={16} className="absolute left-3 top-2.5 text-[#43483e] dark:text-[#c3c8bb]" />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {["ALL", "Winter Wear", "Sports Wear", "Makeup", "Accessories", "Electronics"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition cursor-pointer font-medium ${
                    filterCategory === cat
                      ? "bg-[#446732] dark:bg-[#a9d291] text-white dark:text-[#173807]"
                      : "bg-[#f2f5ea] dark:bg-[#282b24] text-[#43483e] dark:text-[#c3c8bb] hover:bg-[#dfe4d7]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Items List wrapped with PullToRefreshBox */}
            <PullToRefreshBox
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
              containerClassName="max-h-[520px] pr-1"
            >
              <div className="space-y-2">
                {filteredProducts.map(p => {
                  const isSelected = selectedProductId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigateToDetail(p.id)}
                      className={`w-full text-left p-3 rounded-xl border transition cursor-pointer flex items-center space-x-3 group ${
                        isSelected
                          ? "bg-[#f2f5ea] dark:bg-[#282b24] border-[#446732] dark:border-[#a9d291] shadow-2xs"
                          : "bg-white dark:bg-[#191d16] border-[#dfe4d7] dark:border-[#43483e] hover:border-[#446732]"
                      }`}
                    >
                      <img src={p.image} alt={p.name} className="w-14 h-14 object-cover rounded-lg shrink-0 border border-[#dfe4d7] dark:border-[#43483e]" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-[#446732] dark:text-[#a9d291] uppercase">{p.brand}</span>
                          <span className="text-xs font-bold text-[#191d16] dark:text-[#e1e4d9]">${p.price}</span>
                        </div>
                        <h4 className="text-xs font-semibold text-[#191d16] dark:text-[#e1e4d9] truncate mt-0.5">{p.name}</h4>
                        <p className="text-[11px] text-[#43483e] dark:text-[#c3c8bb] truncate mt-0.5">{p.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </PullToRefreshBox>
          </div>

          {/* DETAIL PANE */}
          <div
            className={`flex-1 w-full bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-2xl p-6 shadow-2xs space-y-6 transition-all duration-300 ${
              !isLargeScreen && currentRole === "List" ? "hidden" : "block"
            }`}
          >
            {/* Top Bar for Detail Pane */}
            <div className="flex items-center justify-between border-b border-[#dfe4d7] dark:border-[#43483e] pb-4">
              <div className="flex items-center space-x-2">
                {!isLargeScreen && (
                  <button
                    onClick={handleNavigateBack}
                    className="p-2 bg-[#f2f5ea] dark:bg-[#282b24] hover:bg-[#dfe4d7] rounded-xl text-[#191d16] dark:text-[#e1e4d9] transition cursor-pointer flex items-center space-x-1"
                    title="Predictive Back Navigation"
                  >
                    <MaterialIcon icon="arrow_back" size={18} />
                    <span className="text-xs font-semibold">Back to List</span>
                  </button>
                )}
                <h3 className="text-base font-serif font-bold text-[#191d16] dark:text-[#e1e4d9] flex items-center space-x-2">
                  <MaterialIcon icon="subtitles" size={18} className="text-[#446732] dark:text-[#a9d291]" />
                  <span>Detail Pane</span>
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowExtraPane(!showExtraPane)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1 border ${
                    showExtraPane
                      ? "bg-[#446732] dark:bg-[#a9d291] text-white dark:text-[#173807] border-[#446732]"
                      : "bg-[#f2f5ea] dark:bg-[#282b24] text-[#43483e] dark:text-[#c3c8bb] border-[#dfe4d7] dark:border-[#43483e]"
                  }`}
                >
                  <MaterialIcon icon="auto_awesome" size={15} />
                  <span>{showExtraPane ? "Hide Extra Pane" : "Toggle Extra Pane"}</span>
                </button>
              </div>
            </div>

            {selectedProduct ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Product Detail Image */}
                <div className="space-y-3">
                  <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-[#f2f5ea] dark:bg-[#282b24] border border-[#dfe4d7] dark:border-[#43483e]">
                    <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                    <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 dark:bg-[#191d16]/90 backdrop-blur-md rounded-lg text-xs font-bold font-mono text-[#446732] dark:text-[#a9d291] border border-[#dfe4d7] dark:border-[#43483e]">
                      {selectedProduct.brand}
                    </span>
                  </div>
                </div>

                {/* Details Content */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#446732] dark:text-[#a9d291] uppercase">
                        SKU: {selectedProduct.sku}
                      </span>
                      <div className="flex items-center space-x-1 text-amber-500 text-xs font-bold">
                        <MaterialIcon icon="star" size={16} />
                        <span>{selectedProduct.rating} / 5.0</span>
                      </div>
                    </div>
                    <h2 className="text-xl font-serif font-bold text-[#191d16] dark:text-[#e1e4d9] mt-1">
                      {selectedProduct.name}
                    </h2>
                    <p className="text-2xl font-bold text-[#446732] dark:text-[#a9d291] mt-2">
                      ${selectedProduct.price.toFixed(2)}
                    </p>
                  </div>

                  <p className="text-xs text-[#43483e] dark:text-[#c3c8bb] leading-relaxed">
                    {selectedProduct.description}
                  </p>

                  <div className="p-3.5 bg-[#f2f5ea] dark:bg-[#282b24] border border-[#dfe4d7] dark:border-[#43483e] rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="text-[#43483e] dark:text-[#c3c8bb]">In Stock</span>
                      <span className="font-bold text-[#446732] dark:text-[#a9d291]">{selectedProduct.stock} units available</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-[#43483e] dark:text-[#c3c8bb]">Virtual Try-On</span>
                      <span className="font-bold text-[#191d16] dark:text-[#e1e4d9]">Eligible</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {onAddToCart && (
                      <button
                        onClick={() => onAddToCart(selectedProduct)}
                        className="px-4 py-2.5 bg-[#446732] dark:bg-[#a9d291] hover:bg-[#2d4f1c] dark:hover:bg-[#c5efab] text-white dark:text-[#173807] rounded-xl font-bold text-xs transition cursor-pointer flex items-center space-x-2"
                      >
                        <MaterialIcon icon="shopping_cart" size={16} />
                        <span>Add to Cart</span>
                      </button>
                    )}

                    {onSelectTryOn && (
                      <button
                        onClick={() => onSelectTryOn(selectedProduct)}
                        className="px-4 py-2.5 bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] hover:border-[#446732] text-[#191d16] dark:text-[#e1e4d9] rounded-xl font-bold text-xs transition cursor-pointer flex items-center space-x-2"
                      >
                        <MaterialIcon icon="styler" size={16} className="text-[#446732] dark:text-[#a9d291]" />
                        <span>Virtual Try-On</span>
                      </button>
                    )}

                    {onAskAI && (
                      <button
                        onClick={() => onAskAI(`Tell me more about ${selectedProduct.name} and local store availability`)}
                        className="px-4 py-2.5 bg-[#f2f5ea] dark:bg-[#282b24] hover:bg-[#dfe4d7] text-[#191d16] dark:text-[#e1e4d9] rounded-xl font-bold text-xs transition cursor-pointer flex items-center space-x-2"
                      >
                        <MaterialIcon icon="auto_awesome" size={16} className="text-[#446732] dark:text-[#a9d291]" />
                        <span>Ask Personal Shopper</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-[#43483e] dark:text-[#c3c8bb] space-y-2">
                <MaterialIcon icon="touch_app" size={32} className="mx-auto text-[#446732] dark:text-[#a9d291]" />
                <p className="text-xs font-semibold">Select an item from the List Pane to view details</p>
              </div>
            )}
          </div>

          {/* EXTRA / SUPPORTING PANE */}
          {showExtraPane && (
            <div className="w-full lg:w-[320px] bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-2xl p-4 shadow-2xs space-y-3 shrink-0 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-[#dfe4d7] dark:border-[#43483e]">
                <h4 className="text-xs font-serif font-bold text-[#191d16] dark:text-[#e1e4d9] flex items-center space-x-1.5">
                  <MaterialIcon icon="info" size={16} className="text-[#446732] dark:text-[#a9d291]" />
                  <span>Extra Pane</span>
                </h4>
                <span className="text-[10px] font-mono text-[#43483e] dark:text-[#c3c8bb]">Context Panel</span>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-[#43483e] dark:text-[#c3c8bb]">
                  The optional Extra Pane provides contextual information such as AI shopper insights, real-time inventory across nearby stores, or customer reviews.
                </p>

                <div className="p-3 bg-[#f2f5ea] dark:bg-[#282b24] rounded-xl border border-[#dfe4d7] dark:border-[#43483e] space-y-1">
                  <span className="font-bold text-[#446732] dark:text-[#a9d291]">AI Shopper Analysis</span>
                  <p className="text-[11px] text-[#43483e] dark:text-[#c3c8bb]">
                    Matches 98% with your recent fashion preferences & seasonal climate.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FEED LAYOUT MODE */}
      {layoutMode === "Feed" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-2xl p-4 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold font-serif text-[#191d16] dark:text-[#e1e4d9]">Adaptive Feed Grid Layout</h3>
              <p className="text-xs text-[#43483e] dark:text-[#c3c8bb]">
                GridCells.Adaptive equivalent: auto-responsive multi-column layout for content feeds
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#446732] dark:text-[#a9d291]">
              {products.length} Items
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] hover:border-[#446732] rounded-2xl p-3 shadow-2xs space-y-2.5 flex flex-col justify-between group">
                <div className="space-y-2">
                  <div className="aspect-4/3 rounded-xl overflow-hidden bg-[#f2f5ea] dark:bg-[#282b24] relative">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-white/90 dark:bg-[#191d16]/90 backdrop-blur-md rounded-md text-[10px] font-bold text-[#191d16] dark:text-[#e1e4d9] border border-[#dfe4d7] dark:border-[#43483e] font-mono">
                      ${p.price}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#446732] dark:text-[#a9d291] uppercase">{p.brand}</span>
                    <h4 className="text-xs font-bold text-[#191d16] dark:text-[#e1e4d9] truncate mt-0.5">{p.name}</h4>
                  </div>
                </div>

                <button
                  onClick={() => navigateToDetail(p.id)}
                  className="w-full py-1.5 bg-[#f2f5ea] dark:bg-[#282b24] hover:bg-[#446732] hover:text-white dark:hover:bg-[#a9d291] dark:hover:text-[#173807] text-[#191d16] dark:text-[#e1e4d9] text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1"
                >
                  <span>View Details</span>
                  <MaterialIcon icon="arrow_forward" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUPPORTING PANE LAYOUT MODE */}
      {layoutMode === "SupportingPane" && (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Main Display Area (70%) */}
          <div className="flex-1 bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#dfe4d7] dark:border-[#43483e] pb-3">
              <h3 className="text-base font-bold font-serif text-[#191d16] dark:text-[#e1e4d9] flex items-center space-x-2">
                <MaterialIcon icon="space_dashboard" size={20} className="text-[#446732] dark:text-[#a9d291]" />
                <span>Primary Display Area (70% Space)</span>
              </h3>
              <span className="text-xs font-mono text-[#446732] dark:text-[#a9d291] font-bold">SupportingPaneScaffold</span>
            </div>

            <p className="text-xs text-[#43483e] dark:text-[#c3c8bb] leading-relaxed">
              In a Supporting Pane layout, the primary area holds main tasks (such as active shopping session, virtual try-on studio, or order management) while the secondary pane provides supporting widgets, tools, and reviewer comments.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {products.slice(0, 4).map(p => (
                <div key={p.id} className="p-3.5 bg-[#f2f5ea] dark:bg-[#282b24] rounded-xl border border-[#dfe4d7] dark:border-[#43483e] flex space-x-3 items-center">
                  <img src={p.image} alt={p.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold text-[#446732] dark:text-[#a9d291]">{p.brand}</span>
                    <h4 className="text-xs font-semibold text-[#191d16] dark:text-[#e1e4d9] truncate">{p.name}</h4>
                    <p className="text-xs font-bold text-[#191d16] dark:text-[#e1e4d9] mt-0.5">${p.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary Supporting Pane Area (30%) */}
          <div className="w-full lg:w-[340px] bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-2xl p-5 shadow-2xs space-y-4 shrink-0">
            <div className="flex items-center justify-between border-b border-[#dfe4d7] dark:border-[#43483e] pb-3">
              <h4 className="text-xs font-serif font-bold text-[#191d16] dark:text-[#e1e4d9] flex items-center space-x-1.5">
                <MaterialIcon icon="vertical_split" size={18} className="text-[#446732] dark:text-[#a9d291]" />
                <span>Supporting Pane (30% Space)</span>
              </h4>
              <span className="text-[10px] font-mono text-[#43483e] dark:text-[#c3c8bb]">Secondary Area</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#f2f5ea] dark:bg-[#282b24] rounded-xl border border-[#dfe4d7] dark:border-[#43483e] space-y-1">
                <span className="font-bold text-[#191d16] dark:text-[#e1e4d9]">Shopping Assistant Notes</span>
                <p className="text-[11px] text-[#43483e] dark:text-[#c3c8bb]">
                  Compare specs and live store inventory without leaving the main workspace.
                </p>
              </div>

              <div className="p-3 bg-[#f2f5ea] dark:bg-[#282b24] rounded-xl border border-[#dfe4d7] dark:border-[#43483e] space-y-1">
                <span className="font-bold text-[#446732] dark:text-[#a9d291]">Order History Summary</span>
                <p className="text-[11px] text-[#43483e] dark:text-[#c3c8bb]">
                  {orders.length > 0 ? `${orders.length} recent orders recorded` : "No pending orders."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
