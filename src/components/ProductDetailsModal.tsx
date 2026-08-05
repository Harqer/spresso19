import React, { useState, useEffect, useRef } from "react";
import { MaterialIcon } from "./MaterialIcon";
import { ProductItem, HITLPayload } from "../types";

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
  onAddToCart?: (product: ProductItem, quantity: number, selectedSize?: string) => void;
  onRequestHITLCheckout?: (payload: HITLPayload) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  isOpen,
  onClose,
  product,
  onAddToCart,
  onRequestHITLCheckout,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedSize, setSelectedSize] = useState<string>("8.5");
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [showSizeGuide, setShowSizeGuide] = useState<boolean>(false);
  const [addedToast, setAddedToast] = useState<boolean>(false);
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setActiveImageIdx(0);
      setIsFavorite(false);
      setAddedToast(false);
      setScrollOffset(0);
      
      // Auto-set sensible default size based on category
      if (product.category?.toLowerCase().includes("footwear") || product.category?.toLowerCase().includes("shoe") || product.category?.toLowerCase().includes("sneaker")) {
        setSelectedSize("8.5");
      } else if (product.category?.toLowerCase().includes("apparel") || product.category?.toLowerCase().includes("clothing") || product.category?.toLowerCase().includes("jacket") || product.category?.toLowerCase().includes("hoodie")) {
        setSelectedSize("M");
      } else {
        setSelectedSize("Standard");
      }
    }
  }, [product, isOpen]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setScrollOffset(scrollContainerRef.current.scrollTop);
    }
  };

  if (!isOpen || !product) return null;

  const basePrice = product.price || 0;
  const updatedTotalPrice = (basePrice * quantity).toFixed(2);

  // Available size arrays based on product category
  const isFootwear = product.category?.toLowerCase().includes("footwear") || product.category?.toLowerCase().includes("shoe") || product.category?.toLowerCase().includes("sneaker");
  const isApparel = product.category?.toLowerCase().includes("apparel") || product.category?.toLowerCase().includes("clothing") || product.category?.toLowerCase().includes("jacket") || product.category?.toLowerCase().includes("hoodie");

  const sizeOptions = isFootwear
    ? ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12"]
    : isApparel
    ? ["XS", "S", "M", "L", "XL", "2XL"]
    : ["Standard", "Refill", "Bundle Pack"];

  const galleryImages = [
    product.image,
    ...(product.genMediaKit?.angles || []),
  ].filter(Boolean);

  const handlePlusClick = () => {
    setQuantity(prev => prev + 1);
  };

  const handleMinusClick = () => {
    setQuantity(prev => (prev > 1 ? prev - 1 : 1));
  };

  const handleAddToCartClick = () => {
    if (onAddToCart) {
      onAddToCart(product, quantity, selectedSize);
      setAddedToast(true);
      setTimeout(() => setAddedToast(false), 2200);
    }
  };

  const handleBuyNowClick = () => {
    if (onRequestHITLCheckout) {
      const authId = `AUTH-${Date.now().toString(36).toUpperCase()}`;
      onRequestHITLCheckout({
        authorizationId: authId,
        product: {
          id: product.id,
          name: `${product.name} (Size: ${selectedSize})`,
          price: parseFloat(updatedTotalPrice),
          sku: product.sku || `SKU-${product.id}`,
          image: product.image
        },
        quantity: quantity,
        totalAmount: parseFloat(updatedTotalPrice),
        currency: product.currency || "USD",
        deviceSource: "WEB",
        inventoryConfirmed: true,
        stockRemaining: product.stock || 10,
        humanInTheLoopChallenge: {
          title: "Verify Order & Payment",
          message: `Confirm purchase of ${product.name} (Size ${selectedSize}, Qty ${quantity}) for $${updatedTotalPrice}`,
          safetyChecks: [
            "User identity & biometric token validated",
            "Sufficient wallet balance confirmed",
            "Inventory reserved at merchant"
          ]
        }
      });
      onClose();
    } else handleAddToCartClick();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Check out ${product.name} on Spresso AI Shopper!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Product link copied to clipboard!");
    }
  };

  // Jetsnack style hero collapse calculations
  const collapseRatio = Math.min(1, scrollOffset / 180);
  const heroScale = 1 - collapseRatio * 0.15;
  const heroOpacity = 1 - collapseRatio * 0.65;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 overflow-hidden animate-fade-in select-none">
      <div className="relative w-full max-w-lg h-full sm:h-[92vh] max-h-[92vh] bg-[#f8faf6] dark:bg-[#11140e] text-[#191d16] dark:text-[#e1e4d9] sm:rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden border border-[#dfe4d7] dark:border-[#43483e]">
        
        {/* Floating Top Navigation Header Bar */}
        <div className={`absolute top-0 inset-x-0 z-30 px-5 py-3.5 flex items-center justify-between transition-all duration-200 ${
          scrollOffset > 50 
            ? "bg-white/95 dark:bg-[#191d16]/95 backdrop-blur-md border-b border-[#dfe4d7] dark:border-[#43483e] shadow-xs" 
            : "bg-gradient-to-b from-black/60 via-black/20 to-transparent text-white"
        }`}>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition cursor-pointer flex items-center justify-center ${
              scrollOffset > 50 
                ? "text-[#191d16] dark:text-[#e1e4d9] hover:bg-[#dfe4d7] dark:hover:bg-[#43483e]" 
                : "text-white bg-black/40 hover:bg-black/60 backdrop-blur-md"
            }`}
            title="Back"
          >
            <MaterialIcon icon="arrow_back" size={22} />
          </button>

          <h2 className={`text-sm font-bold truncate max-w-[200px] transition-opacity duration-200 ${
            scrollOffset > 100 ? "opacity-100" : "opacity-0"
          }`}>
            {product.name}
          </h2>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-2 rounded-full transition cursor-pointer flex items-center justify-center ${
                scrollOffset > 50 
                  ? "text-[#191d16] dark:text-[#e1e4d9] hover:bg-[#dfe4d7] dark:hover:bg-[#43483e]" 
                  : "text-white bg-black/40 hover:bg-black/60 backdrop-blur-md"
              }`}
              title="Save to Wishlist"
            >
              <MaterialIcon
                icon={isFavorite ? "favorite" : "favorite_border"}
                size={22}
                className={isFavorite ? "text-red-500" : ""}
              />
            </button>

            <button
              onClick={handleShare}
              className={`p-2 rounded-full transition cursor-pointer flex items-center justify-center ${
                scrollOffset > 50 
                  ? "text-[#191d16] dark:text-[#e1e4d9] hover:bg-[#dfe4d7] dark:hover:bg-[#43483e]" 
                  : "text-white bg-black/40 hover:bg-black/60 backdrop-blur-md"
              }`}
              title="Share"
            >
              <MaterialIcon icon="share" size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Container with Jetsnack Collapsing Parallax Hero Header */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto relative scrollbar-none"
        >
          {/* Jetsnack Collapsing Hero Image Section */}
          <div className="relative w-full h-[320px] bg-[#191d16] flex items-center justify-center overflow-hidden">
            <div 
              className="w-full h-full transition-transform duration-75 ease-out"
              style={{
                transform: `scale(${heroScale}) translateY(${scrollOffset * 0.35}px)`,
                opacity: heroOpacity
              }}
            >
              <img
                src={galleryImages[activeImageIdx] || product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Gallery Thumbnails Overlay */}
            {galleryImages.length > 1 && (
              <div className="absolute bottom-4 inset-x-4 flex items-center justify-center space-x-2 bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-white/20 max-w-max mx-auto z-10">
                {galleryImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition ${
                      activeImageIdx === idx ? "bg-[#a9d291] scale-125" : "bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Jetsnack Expandable Details Sheet Card */}
          <div className="relative bg-[#f8faf6] dark:bg-[#11140e] rounded-t-3xl -mt-6 z-20 px-5 pt-4 pb-8 space-y-6 shadow-xl border-t border-[#dfe4d7] dark:border-[#43483e]">
            
            {/* Sheet Pull Handle Indicator */}
            <div className="flex justify-center pb-1">
              <div className="w-12 h-1.5 bg-[#43483e]/30 dark:bg-[#c3c8bb]/30 rounded-full" />
            </div>

            {/* Title, Brand & Price Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#446732] dark:text-[#a9d291] uppercase tracking-wider">
                  {product.brand || "Spresso Verified Merchant"}
                </span>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#e8efe0] dark:bg-[#20261b] text-xs font-bold text-[#446732] dark:text-[#a9d291]">
                  <MaterialIcon icon="star" size={14} className="text-amber-500 fill-amber-500" />
                  <span>4.9 (128 reviews)</span>
                </span>
              </div>

              <h1 className="text-2xl font-black text-[#191d16] dark:text-[#e1e4d9] leading-tight font-headline">
                {product.name}
              </h1>

              <div className="flex items-baseline justify-between pt-1">
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-black text-[#446732] dark:text-[#a9d291] font-mono">
                    ${updatedTotalPrice}
                  </span>
                  {quantity > 1 && (
                    <span className="text-xs text-[#43483e] dark:text-[#c3c8bb] font-mono">
                      (${basePrice.toFixed(2)} × {quantity})
                    </span>
                  )}
                </div>

                {/* Jetsnack Quantity Selector Controls */}
                <div className="flex items-center bg-[#e8efe0] dark:bg-[#1d2218] border border-[#dfe4d7] dark:border-[#43483e] rounded-full p-1 space-x-2">
                  <button
                    onClick={handleMinusClick}
                    className="w-7 h-7 rounded-full bg-white dark:bg-[#282b24] text-[#191d16] dark:text-[#e1e4d9] flex items-center justify-center transition cursor-pointer font-bold text-base shadow-2xs hover:bg-[#dfe4d7]"
                    title="Decrease Quantity"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold font-mono px-1 min-w-[18px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={handlePlusClick}
                    className="w-7 h-7 rounded-full bg-[#446732] dark:bg-[#a9d291] text-white dark:text-[#191d16] flex items-center justify-center transition cursor-pointer font-bold text-base shadow-2xs hover:opacity-90"
                    title="Increase Quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <hr className="border-[#dfe4d7] dark:border-[#43483e]" />

            {/* PRODUCT SIZE Selector Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#43483e] dark:text-[#c3c8bb] font-mono tracking-wider uppercase">
                  Select Size
                </span>
                <button
                  onClick={() => setShowSizeGuide(!showSizeGuide)}
                  className="text-[#446732] dark:text-[#a9d291] hover:underline font-semibold text-xs cursor-pointer flex items-center space-x-1"
                >
                  <MaterialIcon icon="straighten" size={14} />
                  <span>Size Guide</span>
                </button>
              </div>

              {/* Size Options Horizontal Pill Scroll */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                {sizeOptions.map((sz) => {
                  const isSelected = selectedSize === sz;
                  return (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 border cursor-pointer ${
                        isSelected
                          ? "bg-[#446732] dark:bg-[#a9d291] border-[#446732] dark:border-[#a9d291] text-white dark:text-[#191d16] shadow-md scale-105"
                          : "bg-white dark:bg-[#191d16] border-[#dfe4d7] dark:border-[#43483e] text-[#191d16] dark:text-[#e1e4d9] hover:border-[#446732]"
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>

              {showSizeGuide && (
                <div className="p-3 bg-[#e8efe0] dark:bg-[#1d2218] border border-[#a9d291]/40 rounded-xl text-xs text-[#191d16] dark:text-[#e1e4d9] space-y-1 animate-fade-in">
                  <p className="font-bold text-[#446732] dark:text-[#a9d291]">Standard Fit Sizing</p>
                  <p className="text-[11px] opacity-90">Measurements follow true-to-size specifications. For an oversized fit, select one size up.</p>
                </div>
              )}
            </div>

            <hr className="border-[#dfe4d7] dark:border-[#43483e]" />

            {/* Jetsnack Feature Highlights Badges */}
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="p-2.5 bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-xl flex flex-col items-center justify-center space-y-1">
                <MaterialIcon icon="local_shipping" size={20} className="text-[#446732] dark:text-[#a9d291]" />
                <span className="font-bold">Free Shipping</span>
                <span className="text-[9px] text-[#43483e] dark:text-[#c3c8bb]">2-Day Express</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-xl flex flex-col items-center justify-center space-y-1">
                <MaterialIcon icon="verified" size={20} className="text-[#446732] dark:text-[#a9d291]" />
                <span className="font-bold">Authentic</span>
                <span className="text-[9px] text-[#43483e] dark:text-[#c3c8bb]">100% Guaranteed</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-xl flex flex-col items-center justify-center space-y-1">
                <MaterialIcon icon="replay" size={20} className="text-[#446732] dark:text-[#a9d291]" />
                <span className="font-bold">Easy Returns</span>
                <span className="text-[9px] text-[#43483e] dark:text-[#c3c8bb]">30 Days Policy</span>
              </div>
            </div>

            {/* PRODUCT DESCRIPTION Narrative Section (Jetsnack scroll experience) */}
            <div className="space-y-3 text-left">
              <h3 className="font-bold text-[#43483e] dark:text-[#c3c8bb] font-mono text-xs tracking-wider uppercase flex items-center space-x-1.5">
                <MaterialIcon icon="notes" size={16} className="text-[#446732] dark:text-[#a9d291]" />
                <span>Description & Details</span>
              </h3>

              <p className="text-xs text-[#191d16] dark:text-[#e1e4d9] leading-relaxed">
                {product.description || "Crafted with premium materials designed for ergonomic comfort and enduring style. Engineered for performance and luxury daily wear."}
              </p>

              <div className="space-y-2 pt-2 text-xs text-[#191d16] dark:text-[#e1e4d9]">
                <div className="flex items-center justify-between p-2 bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-lg">
                  <span className="text-[#43483e] dark:text-[#c3c8bb]">SKU / Model</span>
                  <span className="font-mono font-bold">{product.sku || product.id}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-lg">
                  <span className="text-[#43483e] dark:text-[#c3c8bb]">Category</span>
                  <span className="font-bold">{product.category}</span>
                </div>
                {product.genMediaKit?.materials && product.genMediaKit.materials.length > 0 && (
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-lg">
                    <span className="text-[#43483e] dark:text-[#c3c8bb]">Materials</span>
                    <span className="font-bold">{product.genMediaKit.materials.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Added to Cart Feedback Toast Notification */}
        {addedToast && (
          <div className="absolute top-16 inset-x-5 z-40 bg-[#446732] text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-xl flex items-center justify-between animate-bounce">
            <span className="flex items-center space-x-2">
              <MaterialIcon icon="check_circle" size={18} />
              <span>Added to Cart ({quantity}× Size {selectedSize} - ${updatedTotalPrice})</span>
            </span>
          </div>
        )}

        {/* Jetsnack Sticky Bottom Action Bar with Buy Now & Add to Cart */}
        <div className="p-4 bg-white/95 dark:bg-[#191d16]/95 border-t border-[#dfe4d7] dark:border-[#43483e] backdrop-blur-md flex items-center space-x-3 z-30">
          <button
            onClick={handleBuyNowClick}
            className="flex-1 py-3.5 bg-[#446732] hover:bg-[#385428] dark:bg-[#a9d291] dark:hover:bg-[#96c47c] text-white dark:text-[#191d16] font-extrabold text-sm uppercase tracking-wider rounded-2xl transition shadow-md cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>Buy Now (${updatedTotalPrice})</span>
            <MaterialIcon icon="bolt" size={18} />
          </button>

          <button
            onClick={handleAddToCartClick}
            className="w-13 h-13 bg-[#e8efe0] dark:bg-[#282b24] hover:bg-[#dfe4d7] text-[#446732] dark:text-[#a9d291] border border-[#dfe4d7] dark:border-[#43483e] rounded-2xl transition shadow-xs flex items-center justify-center cursor-pointer shrink-0"
            title="Add to Cart"
          >
            <MaterialIcon icon="shopping_cart" size={22} />
          </button>
        </div>

      </div>
    </div>
  );
};

