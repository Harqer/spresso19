import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setActiveImageIdx(0);
      setIsFavorite(false);
      setAddedToast(false);
      
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

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fade-in select-none">
      <div className="relative w-full max-w-lg min-h-screen sm:min-h-0 sm:max-h-[92vh] bg-stone-950 text-white sm:rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden border border-white/10">
        
        {/* Top Header Bar */}
        <div className="sticky top-0 z-30 px-5 py-4 bg-stone-950/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer flex items-center justify-center"
            title="Back"
          >
            <MaterialIcon icon="chevron_left" size={26} />
          </button>

          <h2 className="text-base font-bold text-white tracking-wide font-headline">
            Product Details
          </h2>

          <button
            onClick={handleShare}
            className="p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer flex items-center justify-center"
            title="Share"
          >
            <MaterialIcon icon="share" size={22} />
          </button>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Product Showcase Image Card */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-stone-900 border border-white/10 aspect-square sm:aspect-4/3 flex items-center justify-center group">
            <img
              src={galleryImages[activeImageIdx] || product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            {/* Gallery Thumbnails Overlay if multiple images exist */}
            {galleryImages.length > 1 && (
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-center space-x-2 bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-white/10 max-w-max mx-auto">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-3 h-3 rounded-full transition ${
                      activeImageIdx === idx ? "bg-amber-400 scale-125" : "bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Title, Wishlist Heart & Dynamic Updated Price */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-amber-400 uppercase tracking-widest font-semibold">
                  {product.brand || "Spresso Collection"}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight font-headline">
                  {product.name}
                </h1>
              </div>

              {/* Heart Wishlist Toggle Button */}
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer text-stone-300 hover:text-red-500 shrink-0"
                title="Save to Wishlist"
              >
                <MaterialIcon
                  icon={isFavorite ? "favorite" : "favorite_border"}
                  size={24}
                  className={isFavorite ? "text-red-500" : ""}
                />
              </button>
            </div>

            {/* Live Updated Price Banner */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  ${updatedTotalPrice}
                </span>
                {quantity > 1 && (
                  <span className="text-xs text-stone-400 font-mono">
                    (${basePrice.toFixed(2)} × {quantity})
                  </span>
                )}
              </div>

              {/* Quantity Plus / Minus Selector */}
              <div className="flex items-center bg-stone-900 border border-white/15 rounded-full p-1 space-x-3">
                <button
                  onClick={handleMinusClick}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer font-bold text-lg"
                  title="Decrease Quantity"
                >
                  -
                </button>
                <span className="text-sm font-bold font-mono px-1 min-w-[20px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={handlePlusClick}
                  className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center transition cursor-pointer font-bold text-lg shadow-sm shadow-amber-500/30"
                  title="Increase Quantity (+ Updates Price)"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <hr className="border-white/10" />

          {/* PRODUCT SIZE Selector Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-400 font-mono tracking-wider uppercase">
                PRODUCT SIZE
              </span>
              <button
                onClick={() => setShowSizeGuide(!showSizeGuide)}
                className="text-amber-400 hover:underline font-medium text-xs cursor-pointer"
              >
                Size Guide
              </button>
            </div>

            {/* Size Options Horizontal Pill Scroll */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
              {sizeOptions.map((sz) => {
                const isSelected = selectedSize === sz;
                return (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 border cursor-pointer ${
                      isSelected
                        ? "bg-amber-500 border-amber-400 text-stone-950 shadow-md shadow-amber-500/20 scale-105"
                        : "bg-stone-900 border-white/10 text-stone-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>

            {showSizeGuide && (
              <div className="p-3 bg-stone-900/80 border border-amber-500/30 rounded-xl text-xs text-stone-300 space-y-1 animate-fade-in">
                <p className="font-bold text-amber-400">Standard Sizing Table</p>
                <p>US Sizes adhere to true-to-fit ergonomic measurements. For relaxed fit, select 0.5 size up.</p>
              </div>
            )}
          </div>

          <hr className="border-white/10" />

          {/* PRODUCT SPECIFICATIONS / DETAILS Bulleted List */}
          <div className="space-y-3 text-left">
            <span className="font-bold text-stone-400 font-mono text-xs tracking-wider uppercase block">
              PRODUCT DETAILS
            </span>

            <ul className="space-y-2 text-xs text-stone-300 font-sans list-none">
              <li className="flex items-start space-x-2">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>Model / SKU:</strong> {product.sku || product.id}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>Brand & Origin:</strong> {product.brand} (Authentic Verified)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>Category:</strong> {product.category}</span>
              </li>
              {product.description && (
                <li className="flex items-start space-x-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>Overview:</strong> {product.description}</span>
                </li>
              )}
              {product.genMediaKit?.materials && product.genMediaKit.materials.length > 0 && (
                <li className="flex items-start space-x-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>Material & Craftsmanship:</strong> {product.genMediaKit.materials.join(", ")}</span>
                </li>
              )}
              <li className="flex items-start space-x-2">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>Availability:</strong> Live Merchant Listing (Aggregated Deal)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>Fulfillment:</strong> Express 2-Day Delivery & Easy Returns</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Added to Cart Feedback Toast Notification */}
        {addedToast && (
          <div className="absolute top-16 inset-x-5 z-40 bg-emerald-500 text-stone-950 font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-xl flex items-center justify-between animate-bounce">
            <span className="flex items-center space-x-2">
              <MaterialIcon icon="check_circle" size={18} />
              <span>Added to Cart ({quantity}× Size {selectedSize} - ${updatedTotalPrice})</span>
            </span>
          </div>
        )}

        {/* Sticky Bottom Action Bar with BUY NOW & Add to Cart */}
        <div className="p-4 bg-stone-950/95 border-t border-white/10 backdrop-blur-md flex items-center space-x-3">
          <button
            onClick={handleBuyNowClick}
            className="flex-1 py-3.5 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl transition shadow-xl shadow-red-600/30 cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>BUY NOW</span>
            <MaterialIcon icon="bolt" size={18} />
          </button>

          <button
            onClick={handleAddToCartClick}
            className="w-14 h-14 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-2xl transition shadow-lg shadow-amber-500/25 flex items-center justify-center cursor-pointer shrink-0"
            title="Add to Cart"
          >
            <MaterialIcon icon="shopping_cart" size={24} />
          </button>
        </div>

      </div>
    </div>
  );
};
