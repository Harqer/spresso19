import React, { useState, useEffect, useRef } from "react";
import { ProductItem, HITLPayload } from "../types";
import { MaterialIcon } from "./MaterialIcon";
import { AIShopperInputBar } from "./AIShopperInputBar";
import { SeasonalCategorySection } from "./SeasonalCategorySection";
import { StackedWardrobeDecks } from "./StackedWardrobeDecks";

export type WardrobeCategory = "TOP" | "BOTTOM" | "SWEATER_OUTERWEAR" | "DRESS" | "SHOES" | "ACCESSORY";
export type WeatherSuitability = "HOT_SUMMER" | "COLD_WINTER" | "MILD_SPRING_AUTUMN" | "ALL_WEATHER";

export interface CustomWardrobeItem {
  id: string;
  type: "user_upload" | "bookmarked_product";
  name: string;
  category: WardrobeCategory;
  weatherSuitability: WeatherSuitability;
  image: string;
  color?: string;
  brand?: string;
  price?: number;
  productId?: string;
  addedAt: number;
}

export interface GeneratedOutfit {
  id: string;
  title: string;
  weatherCondition: "HOT_SUMMER" | "COLD_WINTER" | "MILD_SPRING_AUTUMN";
  temperatureText: string;
  items: CustomWardrobeItem[];
  stylingAdvice: string;
  weatherMatchScore: number;
  savedAt: number;
}

interface WardrobeViewProps {
  products: ProductItem[];
  onSelectTryOn: (product: ProductItem) => void;
  onRequestHITLCheckout: (payload: HITLPayload) => void;
  onAskAI?: (text: string, image?: string | null) => void;
}

const AVATARS = [
  { id: "model-1", name: "Studio Avatar", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80" },
  { id: "model-2", name: "Urban Avatar", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80" },
  { id: "model-3", name: "Casual Avatar", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80" }
];

// Pre-populated realistic photo gallery closet items
const INITIAL_PHOTO_GALLERY_ITEMS: CustomWardrobeItem[] = [
  {
    id: "upload-1",
    type: "user_upload",
    name: "Cream Chunky Cable Knit Sweater",
    category: "SWEATER_OUTERWEAR",
    weatherSuitability: "COLD_WINTER",
    image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=600&q=80",
    color: "Cream / Oat",
    brand: "My Closet",
    addedAt: Date.now() - 86400000 * 3
  },
  {
    id: "upload-2",
    type: "user_upload",
    name: "Breezy White Linen Summer Shirt",
    category: "TOP",
    weatherSuitability: "HOT_SUMMER",
    image: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&q=80",
    color: "Pure White",
    brand: "My Closet",
    addedAt: Date.now() - 86400000 * 5
  },
  {
    id: "upload-3",
    type: "user_upload",
    name: "Classic Slim Dark Wash Denim Jeans",
    category: "BOTTOM",
    weatherSuitability: "ALL_WEATHER",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80",
    color: "Indigo Blue",
    brand: "My Closet",
    addedAt: Date.now() - 86400000 * 7
  },
  {
    id: "upload-4",
    type: "user_upload",
    name: "Tailored Camel Wool Winter Coat",
    category: "SWEATER_OUTERWEAR",
    weatherSuitability: "COLD_WINTER",
    image: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=600&q=80",
    color: "Camel Brown",
    brand: "My Closet",
    addedAt: Date.now() - 86400000 * 2
  },
  {
    id: "upload-5",
    type: "user_upload",
    name: "Minimalist Leather White Sneakers",
    category: "SHOES",
    weatherSuitability: "ALL_WEATHER",
    image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=600&q=80",
    color: "Clean White",
    brand: "My Closet",
    addedAt: Date.now() - 86400000 * 4
  },
  {
    id: "upload-6",
    type: "user_upload",
    name: "Pleated Terracotta Summer Shorts",
    category: "BOTTOM",
    weatherSuitability: "HOT_SUMMER",
    image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=600&q=80",
    color: "Terracotta",
    brand: "My Closet",
    addedAt: Date.now() - 86400000 * 1
  }
];

export const WardrobeView: React.FC<WardrobeViewProps> = ({
  products,
  onSelectTryOn,
  onRequestHITLCheckout,
  onAskAI
}) => {
  const [activeTab, setActiveTab] = useState<"STACKED_DECKS" | "ALL" | "SEASONAL" | "PHOTO_GALLERY" | "BOOKMARKS" | "LIKED" | "AI_OUTFIT" | "MIX_MATCH" | "SAVED_OUTFITS">("STACKED_DECKS");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedWeatherFilter, setSelectedWeatherFilter] = useState<string>("ALL");

  // Bookmarked catalog product IDs
  const [bookmarkedProductIds, setBookmarkedProductIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("spresso_wardrobe_items");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Liked Products array
  const [likedProducts, setLikedProducts] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("spresso_liked_products");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dynamically sync likes and bookmarks from storage
  useEffect(() => {
    const syncState = () => {
      try {
        const savedLikes = localStorage.getItem("spresso_liked_products");
        if (savedLikes) {
          const parsed = JSON.parse(savedLikes);
          setLikedProducts(parsed);
        }
        const savedBMs = localStorage.getItem("spresso_wardrobe_items");
        if (savedBMs) {
          setBookmarkedProductIds(JSON.parse(savedBMs));
        }
      } catch {}
    };

    syncState();
    window.addEventListener("storage", syncState);
    const interval = setInterval(syncState, 1500);
    return () => {
      window.removeEventListener("storage", syncState);
      clearInterval(interval);
    };
  }, []);

  // User uploaded photo gallery clothing items
  const [userUploadedItems, setUserUploadedItems] = useState<CustomWardrobeItem[]>(() => {
    try {
      const saved = localStorage.getItem("spresso_custom_wardrobe_items");
      return saved ? JSON.parse(saved) : INITIAL_PHOTO_GALLERY_ITEMS;
    } catch {
      return INITIAL_PHOTO_GALLERY_ITEMS;
    }
  });

  // Saved favorite outfits
  const [savedFavoriteOutfits, setSavedFavoriteOutfits] = useState<GeneratedOutfit[]>(() => {
    try {
      const saved = localStorage.getItem("spresso_favorite_outfits");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Photo Upload Modal state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [uploadCategory, setUploadCategory] = useState<WardrobeCategory>("TOP");
  const [uploadWeather, setUploadWeather] = useState<WeatherSuitability>("HOT_SUMMER");
  const [uploadColor, setUploadColor] = useState<string>("");

  // AI Weather Outfit Generator state
  const [selectedWeatherMode, setSelectedWeatherMode] = useState<"HOT_SUMMER" | "COLD_WINTER" | "MILD_SPRING_AUTUMN">("COLD_WINTER");
  const [temperaturePrompt, setTemperaturePrompt] = useState<string>("38°F Chilly Winter Day");
  const [isGeneratingOutfit, setIsGeneratingOutfit] = useState<boolean>(false);
  const [currentOutfit, setCurrentOutfit] = useState<GeneratedOutfit | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

  // Mix & Match Slot State
  const [mixMatchTop, setMixMatchTop] = useState<CustomWardrobeItem | null>(null);
  const [mixMatchBottom, setMixMatchBottom] = useState<CustomWardrobeItem | null>(null);
  const [mixMatchOuter, setMixMatchOuter] = useState<CustomWardrobeItem | null>(null);
  const [mixMatchShoes, setMixMatchShoes] = useState<CustomWardrobeItem | null>(null);
  const [slotDrawerCategory, setSlotDrawerCategory] = useState<WardrobeCategory | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("spresso_custom_wardrobe_items", JSON.stringify(userUploadedItems));
    } catch (err) {
      console.error("Failed to save custom wardrobe items", err);
    }
  }, [userUploadedItems]);

  useEffect(() => {
    try {
      localStorage.setItem("spresso_favorite_outfits", JSON.stringify(savedFavoriteOutfits));
    } catch (err) {
      console.error("Failed to save favorite outfits", err);
    }
  }, [savedFavoriteOutfits]);

  // Convert bookmarked catalog products to CustomWardrobeItem list
  const bookmarkedWardrobeItems: CustomWardrobeItem[] = products
    .filter(p => bookmarkedProductIds.includes(p.id))
    .map(p => {
      let weather: WeatherSuitability = "ALL_WEATHER";
      const catUpper = p.category.toUpperCase();
      if (catUpper.includes("WINTER") || p.name.toLowerCase().includes("sweater") || p.name.toLowerCase().includes("coat")) {
        weather = "COLD_WINTER";
      } else if (catUpper.includes("SUMMER") || p.name.toLowerCase().includes("shorts") || p.name.toLowerCase().includes("linen")) {
        weather = "HOT_SUMMER";
      }

      let cat: WardrobeCategory = "TOP";
      if (p.name.toLowerCase().includes("jean") || p.name.toLowerCase().includes("pant") || p.name.toLowerCase().includes("short")) {
        cat = "BOTTOM";
      } else if (p.name.toLowerCase().includes("sweater") || p.name.toLowerCase().includes("jacket") || p.name.toLowerCase().includes("coat")) {
        cat = "SWEATER_OUTERWEAR";
      } else if (p.name.toLowerCase().includes("shoe") || p.name.toLowerCase().includes("boot") || p.name.toLowerCase().includes("sneaker")) {
        cat = "SHOES";
      } else if (p.name.toLowerCase().includes("dress")) {
        cat = "DRESS";
      } else if (catUpper.includes("ACCESSORIES")) {
        cat = "ACCESSORY";
      }

      return {
        id: `bookmark-${p.id}`,
        type: "bookmarked_product",
        name: p.name,
        category: cat,
        weatherSuitability: weather,
        image: p.image,
        brand: p.brand,
        price: p.price,
        productId: p.id,
        addedAt: Date.now()
      };
    });

  // Combine uploaded items and bookmarked items
  const allWardrobeItems: CustomWardrobeItem[] = [...userUploadedItems, ...bookmarkedWardrobeItems];

  // Auto-generate an initial outfit on load if available
  useEffect(() => {
    if (!currentOutfit && allWardrobeItems.length > 0) {
      handleGenerateAIOutfit("COLD_WINTER", "38°F Chilly Winter Day");
    }
  }, []);

  // Filtered Items for display
  const filteredItems = allWardrobeItems.filter(item => {
    if (activeTab === "PHOTO_GALLERY" && item.type !== "user_upload") return false;
    if (activeTab === "BOOKMARKS" && item.type !== "bookmarked_product") return false;

    if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false;
    if (selectedWeatherFilter !== "ALL" && item.weatherSuitability !== selectedWeatherFilter && item.weatherSuitability !== "ALL_WEATHER") return false;

    return true;
  });

  // Delete / Remove Wardrobe Item
  const handleDeleteItem = (item: CustomWardrobeItem) => {
    if (item.type === "user_upload") {
      setUserUploadedItems(prev => prev.filter(i => i.id !== item.id));
    } else if (item.type === "bookmarked_product" && item.productId) {
      const updated = bookmarkedProductIds.filter(id => id !== item.productId);
      setBookmarkedProductIds(updated);
      try {
        localStorage.setItem("spresso_wardrobe_items", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to update wardrobe bookmarks", err);
      }
    }
  };

  // Image Upload Handler with Canvas Compression for Android Photo Gallery
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawDataUrl = event.target?.result as string;
        if (!rawDataUrl) return;

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_DIM = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedUrl = canvas.toDataURL("image/jpeg", 0.82);
            setUploadPreview(compressedUrl);
          } else {
            setUploadPreview(rawDataUrl);
          }

          if (!uploadTitle) {
            setUploadTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
          }
        };
        img.onerror = () => {
          setUploadPreview(rawDataUrl);
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUploadedItem = () => {
    if (!uploadPreview) return;

    const newItem: CustomWardrobeItem = {
      id: `upload-${Date.now()}`,
      type: "user_upload",
      name: uploadTitle || "My Gallery Clothes",
      category: uploadCategory,
      weatherSuitability: uploadWeather,
      image: uploadPreview,
      color: uploadColor || undefined,
      brand: "Photo Gallery Upload",
      addedAt: Date.now()
    };

    setUserUploadedItems(prev => [newItem, ...prev]);
    setShowUploadModal(false);
    setUploadPreview(null);
    setUploadTitle("");
    setUploadColor("");
  };

  // AI Weather Outfit Generator Trigger
  const handleGenerateAIOutfit = async (mode: "HOT_SUMMER" | "COLD_WINTER" | "MILD_SPRING_AUTUMN", tempText: string) => {
    setIsGeneratingOutfit(true);
    setSelectedWeatherMode(mode);
    setTemperaturePrompt(tempText);

    try {
      const res = await fetch("/api/wardrobe/generate-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: allWardrobeItems,
          weatherCondition: mode,
          temperatureText: tempText
        })
      });

      const data = await res.json();
      if (data.success && data.result) {
        const { title, selectedItemIds, stylingAdvice, weatherMatchScore } = data.result;

        // Resolve selected items from allWardrobeItems
        let matchedItems = allWardrobeItems.filter(i => selectedItemIds.includes(i.id));

        // If no match returned, fall back to matching category pieces
        if (matchedItems.length === 0) {
          const suitable = allWardrobeItems.filter(i => i.weatherSuitability === mode || i.weatherSuitability === "ALL_WEATHER");
          const pool = suitable.length > 0 ? suitable : allWardrobeItems;

          const top = pool.find(i => i.category === "TOP" || i.category === "DRESS");
          const bottom = pool.find(i => i.category === "BOTTOM");
          const outer = pool.find(i => i.category === "SWEATER_OUTERWEAR");
          const shoes = pool.find(i => i.category === "SHOES" || i.category === "ACCESSORY");

          matchedItems = [top, outer, bottom, shoes].filter(Boolean) as CustomWardrobeItem[];
        }

        const newOutfit: GeneratedOutfit = {
          id: `outfit-${Date.now()}`,
          title: title || (mode === "COLD_WINTER" ? "Warm Winter Ensemble" : mode === "HOT_SUMMER" ? "Summer Breeze Look" : "Spring Layered Outfit"),
          weatherCondition: mode,
          temperatureText: tempText,
          items: matchedItems,
          stylingAdvice: stylingAdvice || `Curated from your photo gallery and saved items for ${tempText}.`,
          weatherMatchScore: weatherMatchScore || 95,
          savedAt: Date.now()
        };

        setCurrentOutfit(newOutfit);
      }
    } catch (err) {
      console.error("AI Outfit generation error:", err);
      // Fallback local shuffle
      handleRandomizeShuffle(mode, tempText);
    } finally {
      setIsGeneratingOutfit(false);
    }
  };

  // Randomize / Shuffle Outfit from Gallery
  const handleRandomizeShuffle = (mode = selectedWeatherMode, tempText = temperaturePrompt) => {
    setIsGeneratingOutfit(true);
    setTimeout(() => {
      const suitable = allWardrobeItems.filter(i => i.weatherSuitability === mode || i.weatherSuitability === "ALL_WEATHER");
      const pool = suitable.length > 0 ? suitable : allWardrobeItems;

      const tops = pool.filter(i => i.category === "TOP" || i.category === "DRESS");
      const bottoms = pool.filter(i => i.category === "BOTTOM");
      const outer = pool.filter(i => i.category === "SWEATER_OUTERWEAR");
      const shoes = pool.filter(i => i.category === "SHOES" || i.category === "ACCESSORY");

      const selected: CustomWardrobeItem[] = [];

      if (tops.length > 0) selected.push(tops[Math.floor(Math.random() * tops.length)]);
      if (mode === "COLD_WINTER" && outer.length > 0) {
        selected.push(outer[Math.floor(Math.random() * outer.length)]);
      } else if (outer.length > 0 && Math.random() > 0.5) {
        selected.push(outer[Math.floor(Math.random() * outer.length)]);
      }
      if (bottoms.length > 0) selected.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
      if (shoes.length > 0) selected.push(shoes[Math.floor(Math.random() * shoes.length)]);

      const shuffleTitles = {
        HOT_SUMMER: ["Sunny Linen & Short Outfit", "Breezy Summer Park Ensemble", "Hot Weather Casual Look"],
        COLD_WINTER: ["Layered Cashmere & Denim Winter Look", "Chilly Evening Wool Coat Combination", "Cozy Sweater & Boots Look"],
        MILD_SPRING_AUTUMN: ["Layered Cardigan & Sneakers Look", "Mild Autumn Breeze Outfit", "Spring Promenade Ensemble"]
      };

      const titleList = shuffleTitles[mode] || ["Custom Weather Combination"];
      const randomTitle = titleList[Math.floor(Math.random() * titleList.length)];

      const newOutfit: GeneratedOutfit = {
        id: `outfit-${Date.now()}`,
        title: randomTitle,
        weatherCondition: mode,
        temperatureText: tempText,
        items: selected.length > 0 ? selected : allWardrobeItems.slice(0, 3),
        stylingAdvice: `Randomized mix from your uploaded photo gallery clothing for ${tempText}. High breathability and balanced color tone.`,
        weatherMatchScore: 92 + Math.floor(Math.random() * 7),
        savedAt: Date.now()
      };

      setCurrentOutfit(newOutfit);
      setIsGeneratingOutfit(false);
    }, 400);
  };

  const handleSaveFavoriteOutfit = (outfit: GeneratedOutfit) => {
    if (!savedFavoriteOutfits.some(o => o.id === outfit.id)) {
      setSavedFavoriteOutfits(prev => [outfit, ...prev]);
    }
  };

  const handleCheckoutProduct = (product: ProductItem) => {
    const payload: HITLPayload = {
      authorizationId: `ORDER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        sku: product.sku,
        image: product.image
      },
      quantity: 1,
      totalAmount: product.price,
      currency: product.currency,
      deviceSource: "WEB",
      inventoryConfirmed: product.stock > 0,
      stockRemaining: product.stock,
      humanInTheLoopChallenge: {
        title: "Confirm Purchase",
        message: `Authorize $${product.price.toFixed(2)} for ${product.name}?`,
        safetyChecks: [
          "Reserved from personal closet wardrobe",
          "Includes free express shipping",
          "Click confirm to place order"
        ]
      }
    };
    onRequestHITLCheckout(payload);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header & Primary Action Bar */}
      <div className="bg-white p-6 rounded-3xl border border-[#d8ebd7] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center space-x-3.5">
          <div className="p-3.5 bg-[#e8f3e8] border border-[#d8ebd7] rounded-2xl text-[#386633] shadow-xs shrink-0">
            <MaterialIcon icon="checkroom" size={28} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-[#18211e] font-headline">My Smart Wardrobe & Camera Gallery</h2>
              <span className="px-2.5 py-0.5 bg-[#e8f3e8] text-[#386633] text-[10px] font-mono font-bold rounded-full border border-[#d8ebd7]">
                {allWardrobeItems.length} Closet Items
              </span>
            </div>
            <p className="text-xs text-[#5e635f] mt-0.5">
              Snap personal clothes from your camera photo gallery & save catalog bookmarks. AI generates weather-smart outfits automatically!
            </p>
          </div>
        </div>

        {/* Action Buttons: Add Camera Photo & AI Generate */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2.5 bg-[#386633] hover:bg-[#2c5227] text-white rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center space-x-2"
          >
            <MaterialIcon icon="add_a_photo" size={16} />
            <span>Add Personal Clothes</span>
          </button>

          <button
            onClick={() => setActiveTab("AI_OUTFIT")}
            className="px-4 py-2.5 bg-[#e8f3e8] hover:bg-[#d8ebd7] text-[#386633] border border-[#386633]/30 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
          >
            <MaterialIcon icon="auto_awesome" size={16} />
            <span>AI Weather Generator</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="flex items-center space-x-2 border-b border-[#d8ebd7] pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "STACKED_DECKS", label: "🎴 Stacked Deck Fan-Out Fits", count: allWardrobeItems.length + likedProducts.length },
          { id: "SEASONAL", label: "🌟 Seasonal Collections", count: allWardrobeItems.length },
          { id: "BOOKMARKS", label: "🔖 Saved Catalog Bookmarks", count: bookmarkedWardrobeItems.length },
          { id: "LIKED", label: "❤️ Liked Items", count: likedProducts.length },
          { id: "AI_OUTFIT", label: "🌤️ AI Weather Generator", count: currentOutfit ? 1 : 0 },
          { id: "MIX_MATCH", label: "🎨 Mix & Match Studio", count: null },
          { id: "ALL", label: "👔 All Closet Items", count: allWardrobeItems.length },
          { id: "PHOTO_GALLERY", label: "📷 Photo Gallery Uploads", count: userUploadedItems.length },
          { id: "SAVED_OUTFITS", label: "⭐ Favorite Outfits", count: savedFavoriteOutfits.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeTab === tab.id
                ? "bg-[#386633] text-white shadow-xs"
                : "bg-white text-[#5e635f] hover:bg-[#e8f3e8] hover:text-[#18211e] border border-[#d8ebd7]"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-[#e8f3e8] text-[#386633]"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: STACKED WARDROBE DECKS (JETPACK MOTION FAN-OUT STACKED CARDS) */}
      {/* ========================================================================= */}
      {activeTab === "STACKED_DECKS" && (
        <StackedWardrobeDecks
          userUploadedItems={userUploadedItems}
          bookmarkedItems={bookmarkedWardrobeItems}
          likedProducts={likedProducts}
          products={products}
          onSelectTryOn={onSelectTryOn}
          onRequestHITLCheckout={onRequestHITLCheckout}
          onOpenUploadModal={() => setShowUploadModal(true)}
          onSaveFavoriteOutfit={handleSaveFavoriteOutfit}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 0: SEASONAL WARDROBE CATEGORIES (REUSABLE COMPONENT) */}
      {/* ========================================================================= */}
      {activeTab === "SEASONAL" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summer Section */}
          <SeasonalCategorySection
            title="☀️ Solstice Sun & Linen Collection"
            subtitle="Breathable linen shirts, breezy dresses, tailored shorts & UV resortwear for warm days"
            seasonBadge="Hot Summer Wear"
            seasonTheme="summer"
            items={allWardrobeItems.filter(i =>
              i.weatherSuitability === "HOT_SUMMER" ||
              i.name.toLowerCase().includes("linen") ||
              i.name.toLowerCase().includes("short") ||
              i.name.toLowerCase().includes("summer")
            )}
            onPrimaryAction={(item) => {
              if (item.productId) {
                const found = products.find(p => p.id === item.productId);
                if (found) onSelectTryOn(found);
              } else {
                setActiveTab("MIX_MATCH");
              }
            }}
          />

          {/* Winter Section */}
          <SeasonalCategorySection
            title="❄️ Alpine Frost & Cashmere Haven"
            subtitle="Chunky knit sweaters, tailored wool coats, thermal denim & insulated winter boots"
            seasonBadge="Cold Winter Wear"
            seasonTheme="winter"
            items={allWardrobeItems.filter(i =>
              i.weatherSuitability === "COLD_WINTER" ||
              i.category === "SWEATER_OUTERWEAR" ||
              i.name.toLowerCase().includes("sweater") ||
              i.name.toLowerCase().includes("coat") ||
              i.name.toLowerCase().includes("jacket")
            )}
            onPrimaryAction={(item) => {
              if (item.productId) {
                const found = products.find(p => p.id === item.productId);
                if (found) onSelectTryOn(found);
              } else {
                setActiveTab("MIX_MATCH");
              }
            }}
          />

          {/* Autumn Section */}
          <SeasonalCategorySection
            title="🍂 Autumn Ember & Tweed Ensemble"
            subtitle="Layered cardigans, rich earth-tone denim, leather jackets & transitional footwear"
            seasonBadge="Fall Autumn Wear"
            seasonTheme="autumn"
            items={allWardrobeItems.filter(i =>
              i.weatherSuitability === "MILD_SPRING_AUTUMN" ||
              i.category === "BOTTOM" ||
              i.name.toLowerCase().includes("denim") ||
              i.name.toLowerCase().includes("jean")
            )}
            onPrimaryAction={(item) => {
              if (item.productId) {
                const found = products.find(p => p.id === item.productId);
                if (found) onSelectTryOn(found);
              } else {
                setActiveTab("MIX_MATCH");
              }
            }}
          />

          {/* Spring Section */}
          <SeasonalCategorySection
            title="🌸 Vernal Bloom & Silk Promenade"
            subtitle="Pastel silks, flowy skirts, floral blouses & clean crisp spring footwear"
            seasonBadge="Spring Bloom"
            seasonTheme="spring"
            items={allWardrobeItems.filter(i =>
              i.category === "DRESS" ||
              i.category === "ACCESSORY" ||
              i.weatherSuitability === "ALL_WEATHER"
            )}
            onPrimaryAction={(item) => {
              if (item.productId) {
                const found = products.find(p => p.id === item.productId);
                if (found) onSelectTryOn(found);
              } else {
                setActiveTab("MIX_MATCH");
              }
            }}
          />

          {/* Resort & Travel Section */}
          <SeasonalCategorySection
            title="🌊 Coastal Resort & Breeze Essentials"
            subtitle="Breathable vacation wear, UV protection tees, beach accessories & travel footwear"
            seasonBadge="Resort & Travel"
            seasonTheme="resort"
            items={allWardrobeItems.filter(i =>
              i.category === "SHOES" ||
              i.type === "user_upload"
            )}
            onPrimaryAction={(item) => {
              if (item.productId) {
                const found = products.find(p => p.id === item.productId);
                if (found) onSelectTryOn(found);
              } else {
                setActiveTab("MIX_MATCH");
              }
            }}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: AI WEATHER OUTFIT GENERATOR */}
      {/* ========================================================================= */}
      {activeTab === "AI_OUTFIT" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Weather Selector & Temperature Control Box */}
          <div className="bg-gradient-to-r from-[#e8f3e8] to-[#f2f8f2] p-6 rounded-3xl border border-[#d8ebd7] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-[#386633]">
                <MaterialIcon icon="thermostat" size={22} />
                <h3 className="font-bold text-sm text-[#18211e]">Select Current Weather or Season</h3>
              </div>
              <span className="text-[11px] text-[#5e635f] font-mono font-semibold">
                Grounded in your uploaded photo gallery ({userUploadedItems.length} items)
              </span>
            </div>

            {/* Quick Weather Preset Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  mode: "HOT_SUMMER" as const,
                  icon: "wb_sunny",
                  title: "☀️ Hot & Sunny (80°F+)",
                  desc: "Shorts, Linen, Tees, Lightweight Dresses, Sandals",
                  tempDefault: "85°F Sunny & Breezy"
                },
                {
                  mode: "COLD_WINTER" as const,
                  icon: "ac_unit",
                  title: "❄️ Cold Winter (30°F - 50°F)",
                  desc: "Chunky Sweaters, Wool Coats, Denim, Jackets, Boots",
                  tempDefault: "38°F Chilly Winter Day"
                },
                {
                  mode: "MILD_SPRING_AUTUMN" as const,
                  icon: "filter_vintage",
                  title: "🍂 Mild Spring / Autumn (60°F - 72°F)",
                  desc: "Layered Cardigans, Jeans, Light Jackets, Sneakers",
                  tempDefault: "64°F Mild Afternoon Breeze"
                }
              ].map(preset => (
                <button
                  key={preset.mode}
                  type="button"
                  onClick={() => {
                    setSelectedWeatherMode(preset.mode);
                    setTemperaturePrompt(preset.tempDefault);
                    handleGenerateAIOutfit(preset.mode, preset.tempDefault);
                  }}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between space-y-2 ${
                    selectedWeatherMode === preset.mode
                      ? "bg-white border-[#386633] shadow-md ring-2 ring-[#386633]/20"
                      : "bg-white/70 border-[#d8ebd7] hover:bg-white hover:border-[#386633]/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#18211e]">{preset.title}</span>
                    <MaterialIcon icon={preset.icon} size={18} className="text-[#386633]" />
                  </div>
                  <p className="text-[11px] text-[#5e635f] leading-snug">{preset.desc}</p>
                </button>
              ))}
            </div>

            {/* Custom Temperature / Notes Row & Generate Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <div className="relative flex-1 w-full">
                <MaterialIcon icon="edit_note" size={18} className="absolute left-3.5 top-2.5 text-[#386633]" />
                <input
                  type="text"
                  value={temperaturePrompt}
                  onChange={e => setTemperaturePrompt(e.target.value)}
                  placeholder="E.g. 78°F Beach day or 42°F Evening Dinner..."
                  className="w-full bg-white border border-[#d8ebd7] rounded-xl pl-10 pr-3 py-2 text-xs font-semibold text-[#18211e] focus:outline-none focus:border-[#386633]"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  onClick={() => handleGenerateAIOutfit(selectedWeatherMode, temperaturePrompt)}
                  disabled={isGeneratingOutfit}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#386633] hover:bg-[#2c5227] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isGeneratingOutfit ? (
                    <>
                      <MaterialIcon icon="refresh" size={16} className="animate-spin" />
                      <span>Synthesizing Outfit...</span>
                    </>
                  ) : (
                    <>
                      <MaterialIcon icon="auto_awesome" size={16} />
                      <span>Generate AI Weather Outfit</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleRandomizeShuffle(selectedWeatherMode, temperaturePrompt)}
                  disabled={isGeneratingOutfit}
                  className="px-3.5 py-2.5 bg-white hover:bg-[#e8f3e8] text-[#386633] border border-[#d8ebd7] rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1"
                  title="Randomly shuffle items from your photo gallery"
                >
                  <MaterialIcon icon="casino" size={16} />
                  <span className="hidden sm:inline">Shuffle</span>
                </button>
              </div>
            </div>
          </div>

          {/* Generated Outfit Spotlight Card */}
          {currentOutfit && (
            <div className="bg-white rounded-3xl border border-[#d8ebd7] shadow-sm p-6 space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f2f8f2] pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 bg-[#386633] text-white text-[10px] font-mono font-bold rounded-full">
                      {currentOutfit.weatherMatchScore}% Weather Match
                    </span>
                    <span className="text-xs text-[#5e635f] font-mono font-semibold">
                      {currentOutfit.temperatureText}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#18211e] mt-1 font-headline">{currentOutfit.title}</h3>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleSaveFavoriteOutfit(currentOutfit)}
                    className="px-3 py-1.5 bg-[#e8f3e8] hover:bg-[#386633] text-[#386633] hover:text-white border border-[#d8ebd7] rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1"
                  >
                    <MaterialIcon icon="star" size={15} />
                    <span>Save to Favorites</span>
                  </button>

                  <button
                    onClick={() => handleRandomizeShuffle(selectedWeatherMode, temperaturePrompt)}
                    className="p-1.5 rounded-xl bg-stone-100 hover:bg-[#e8f3e8] text-[#18211e] transition cursor-pointer"
                    title="Generate another combination"
                  >
                    <MaterialIcon icon="shuffle" size={18} />
                  </button>
                </div>
              </div>

              {/* Outfit Breakdown Grid & Virtual Avatar Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Selected Items Side-by-Side (8 cols) */}
                <div className="lg:col-span-8 space-y-4">
                  <h4 className="text-xs font-bold text-[#5e635f] uppercase tracking-wider font-mono">
                    Outfit Clothing Combination ({currentOutfit.items.length} Pieces)
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {currentOutfit.items.map(item => (
                      <div key={item.id} className="bg-[#f9fbf9] p-3 rounded-2xl border border-[#d8ebd7] flex flex-col justify-between space-y-2 group hover:border-[#386633] transition">
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-white">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold shadow-xs ${
                            item.type === "user_upload" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {item.type === "user_upload" ? "📷 Gallery Photo" : "🔖 Bookmarked Shop"}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-mono font-bold text-[#386633] uppercase block">
                            {item.category.replace("_", " ")}
                          </span>
                          <h5 className="font-bold text-xs text-[#18211e] line-clamp-1">{item.name}</h5>
                          {item.price && (
                            <span className="text-xs font-mono font-bold text-[#386633] block mt-0.5">
                              ${item.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* AI Styling Advice Box */}
                  <div className="p-4 bg-[#f2f8f2] border border-[#d8ebd7] rounded-2xl space-y-1 text-xs text-[#2d4d29]">
                    <div className="flex items-center space-x-1.5 font-bold text-[#386633]">
                      <MaterialIcon icon="psychology" size={16} />
                      <span>Spresso AI Personal Stylist Notes:</span>
                    </div>
                    <p className="leading-relaxed text-[#48524d]">{currentOutfit.stylingAdvice}</p>
                  </div>
                </div>

                {/* 3D Virtual Avatar Preview (4 cols) */}
                <div className="lg:col-span-4 bg-[#f2f8f2] p-4 rounded-2xl border border-[#d8ebd7] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-[#386633] font-bold text-xs">
                      <MaterialIcon icon="face" size={16} />
                      <span>Fitted Virtual Model</span>
                    </div>

                    {/* Model Switcher */}
                    <select
                      value={selectedAvatar.id}
                      onChange={e => {
                        const found = AVATARS.find(a => a.id === e.target.value);
                        if (found) setSelectedAvatar(found);
                      }}
                      className="text-[10px] font-bold bg-white border border-[#d8ebd7] rounded-lg px-2 py-1 text-[#18211e]"
                    >
                      {AVATARS.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Model Card Image */}
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-xs border border-[#d8ebd7] bg-white">
                    <img src={selectedAvatar.url} alt={selectedAvatar.name} className="w-full h-full object-cover" />

                    <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-md p-2 rounded-xl border border-[#d8ebd7] shadow-md flex items-center space-x-2">
                      <MaterialIcon icon="check_circle" size={16} className="text-[#386633]" />
                      <div>
                        <span className="text-[10px] font-bold text-[#18211e] block">Virtual Avatar Wearing Look</span>
                        <span className="text-[9px] text-[#5e635f] block">3D Garment Simulation Rendered</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MIX & MATCH STUDIO */}
      {/* ========================================================================= */}
      {activeTab === "MIX_MATCH" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white p-6 rounded-3xl border border-[#d8ebd7] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#18211e]">Interactive Outfit Mix & Match Canvas</h3>
                <p className="text-xs text-[#5e635f] mt-0.5">
                  Select items from your photo gallery or saved bookmarks to combine into your custom look!
                </p>
              </div>

              <button
                onClick={() => {
                  setMixMatchTop(null);
                  setMixMatchBottom(null);
                  setMixMatchOuter(null);
                  setMixMatchShoes(null);
                }}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-xs font-bold rounded-xl text-[#5e635f] transition cursor-pointer"
              >
                Clear All Slots
              </button>
            </div>

            {/* 4 Interactive Outfit Slots Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { slotLabel: "Top / Shirt", category: "TOP" as WardrobeCategory, item: mixMatchTop, setItem: setMixMatchTop, icon: "apparel" },
                { slotLabel: "Outerwear / Sweater", category: "SWEATER_OUTERWEAR" as WardrobeCategory, item: mixMatchOuter, setItem: setMixMatchOuter, icon: "dry_cleaning" },
                { slotLabel: "Bottom / Pants", category: "BOTTOM" as WardrobeCategory, item: mixMatchBottom, setItem: setMixMatchBottom, icon: "checkroom" },
                { slotLabel: "Footwear", category: "SHOES" as WardrobeCategory, item: mixMatchShoes, setItem: setMixMatchShoes, icon: "roller_skating" }
              ].map((slot, idx) => (
                <div key={idx} className="bg-[#f9fbf9] p-4 rounded-2xl border border-[#d8ebd7] space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-bold text-[#386633]">
                    <span className="flex items-center space-x-1">
                      <MaterialIcon icon={slot.icon} size={16} />
                      <span>{slot.slotLabel}</span>
                    </span>
                    {slot.item && (
                      <button
                        onClick={() => slot.setItem(null)}
                        className="text-[10px] text-red-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {slot.item ? (
                    <div className="space-y-2 text-center">
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-white border border-[#d8ebd7]">
                        <img src={slot.item.image} alt={slot.item.name} className="w-full h-full object-cover" />
                      </div>
                      <h5 className="font-bold text-xs text-[#18211e] line-clamp-1">{slot.item.name}</h5>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSlotDrawerCategory(slot.category)}
                      className="w-full aspect-square border-2 border-dashed border-[#d8ebd7] hover:border-[#386633] rounded-xl flex flex-col items-center justify-center text-[#5e635f] hover:text-[#386633] transition cursor-pointer p-3 space-y-1 bg-white/50"
                    >
                      <MaterialIcon icon="add_circle_outline" size={24} />
                      <span className="text-xs font-bold">Pick {slot.slotLabel}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSlotDrawerCategory(slot.category)}
                    className="w-full py-1.5 bg-white hover:bg-[#e8f3e8] border border-[#d8ebd7] rounded-xl text-xs font-bold text-[#386633] transition cursor-pointer"
                  >
                    {slot.item ? "Change Item" : "Select Item"}
                  </button>
                </div>
              ))}
            </div>

            {/* Save Mix & Match Outfit Action */}
            <div className="pt-3 border-t border-[#f2f8f2] flex justify-end">
              <button
                onClick={() => {
                  const items = [mixMatchTop, mixMatchOuter, mixMatchBottom, mixMatchShoes].filter(Boolean) as CustomWardrobeItem[];
                  if (items.length === 0) return;
                  const newOutfit: GeneratedOutfit = {
                    id: `custom-mix-${Date.now()}`,
                    title: "Personal Mix & Match Outfit",
                    weatherCondition: "MILD_SPRING_AUTUMN",
                    temperatureText: "Custom Styling",
                    items,
                    stylingAdvice: "Hand-crafted combination from your personal photo gallery closet.",
                    weatherMatchScore: 98,
                    savedAt: Date.now()
                  };
                  handleSaveFavoriteOutfit(newOutfit);
                  setActiveTab("SAVED_OUTFITS");
                }}
                disabled={![mixMatchTop, mixMatchOuter, mixMatchBottom, mixMatchShoes].some(Boolean)}
                className="px-5 py-2.5 bg-[#386633] hover:bg-[#2c5227] text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center space-x-2"
              >
                <MaterialIcon icon="bookmark_add" size={16} />
                <span>Save Mix & Match Outfit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ALL CLOSET ITEMS / PHOTO GALLERY / BOOKMARKS GRID */}
      {/* ========================================================================= */}
      {(activeTab === "ALL" || activeTab === "PHOTO_GALLERY" || activeTab === "BOOKMARKS") && (
        <div className="space-y-4 animate-fadeIn">
          {/* Sub-Filter Controls */}
          <div className="bg-white p-4 rounded-2xl border border-[#d8ebd7] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#18211e]">Category:</span>
              <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
                {["ALL", "TOP", "BOTTOM", "SWEATER_OUTERWEAR", "DRESS", "SHOES", "ACCESSORY"].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat ? "bg-[#386633] text-white" : "bg-[#f2f8f2] text-[#444748] hover:bg-[#e8f3e8]"
                    }`}
                  >
                    {cat.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#18211e]">Weather:</span>
              <select
                value={selectedWeatherFilter}
                onChange={e => setSelectedWeatherFilter(e.target.value)}
                className="text-xs font-bold bg-[#f2f8f2] border border-[#d8ebd7] rounded-xl px-2.5 py-1 text-[#18211e]"
              >
                <option value="ALL">All Weathers</option>
                <option value="HOT_SUMMER">☀️ Hot Summer</option>
                <option value="COLD_WINTER">❄️ Cold Winter</option>
                <option value="MILD_SPRING_AUTUMN">🍂 Mild Spring</option>
              </select>
            </div>
          </div>

          {/* Grid of Items */}
          {filteredItems.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#d8ebd7] text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 bg-[#f2f8f2] text-[#386633] rounded-2xl flex items-center justify-center mx-auto">
                <MaterialIcon icon="photo_library" size={28} />
              </div>
              <h3 className="text-sm font-bold text-[#18211e]">No Clothes Found in this Filter</h3>
              <p className="text-xs text-[#5e635f] max-w-sm mx-auto">
                Snap photos of your clothes from your device gallery or bookmark products from the store!
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-[#386633] text-white rounded-xl text-xs font-bold mx-auto cursor-pointer"
              >
                Snap Photo Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-[#d8ebd7] hover:border-[#386633] transition overflow-hidden shadow-xs flex flex-col justify-between group"
                >
                  <div className="relative aspect-square overflow-hidden bg-[#f2f8f2]">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition" />

                    {/* Source Badge */}
                    <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold shadow-xs ${
                      item.type === "user_upload" ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    }`}>
                      {item.type === "user_upload" ? "📷 Gallery Upload" : "🔖 Bookmarked"}
                    </span>

                    {/* Delete Action Button */}
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-red-600 hover:bg-red-600 hover:text-white transition shadow-sm cursor-pointer"
                      title="Remove from Wardrobe"
                    >
                      <MaterialIcon icon="delete" size={15} />
                    </button>
                  </div>

                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-[#386633] uppercase">
                          {item.category.replace("_", " ")}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-[#5e635f] bg-[#f2f8f2] px-1.5 py-0.5 rounded">
                          {item.weatherSuitability === "COLD_WINTER" ? "❄️ Winter" : item.weatherSuitability === "HOT_SUMMER" ? "☀️ Summer" : "🌈 All"}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-[#18211e] mt-1 line-clamp-1">{item.name}</h4>
                    </div>

                    <div className="pt-2 border-t border-[#f2f8f2] flex items-center justify-between">
                      {item.price ? (
                        <span className="text-sm font-mono font-bold text-[#386633]">${item.price.toFixed(2)}</span>
                      ) : (
                        <span className="text-[10px] text-[#5e635f] font-mono">Personal Wardrobe</span>
                      )}

                      {/* Try On & Checkout Button */}
                      {item.productId && (
                        <button
                          onClick={() => {
                            const found = products.find(p => p.id === item.productId);
                            if (found) handleCheckoutProduct(found);
                          }}
                          className="px-2.5 py-1 bg-[#386633] hover:bg-[#2c5227] text-white rounded-lg text-[10px] font-bold cursor-pointer transition"
                        >
                          Buy Item
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: LIKED ITEMS HEADER & GRID */}
      {/* ========================================================================= */}
      {activeTab === "LIKED" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white p-5 rounded-3xl border border-[#d8ebd7] shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-[#18211e]">❤️ Liked Products</h3>
              <p className="text-xs text-[#5e635f] mt-0.5">
                Products you liked using the widget Floating Action Button (FAB) during Google Lens or Virtual Try-On sessions.
              </p>
            </div>
            <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-mono font-bold rounded-full border border-rose-300">
              {likedProducts.length} Liked
            </span>
          </div>

          {likedProducts.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#d8ebd7] text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <MaterialIcon icon="favorite" size={28} />
              </div>
              <h3 className="text-sm font-bold text-[#18211e]">No Liked Products Yet</h3>
              <p className="text-xs text-[#5e635f] max-w-sm mx-auto">
                Tap the elevated widget floating action button (FAB) in Google Lens or Virtual Try-On to like any product!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {likedProducts.map((prod, idx) => {
                const prodId = prod.id || prod.sku || `liked-${idx}`;
                return (
                  <div
                    key={prodId}
                    className="bg-white rounded-2xl border border-[#d8ebd7] hover:border-rose-400 transition overflow-hidden shadow-xs flex flex-col justify-between group"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#f2f8f2]">
                      <img src={prod.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition" />

                      {/* Liked Heart Badge */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold shadow-xs bg-rose-500 text-white flex items-center space-x-1">
                        <MaterialIcon icon="favorite" size={10} />
                        <span>Liked</span>
                      </span>

                      {/* Unlike / Delete Button */}
                      <button
                        onClick={() => {
                          const updated = likedProducts.filter(p => (p.id || p.sku) !== (prod.id || prod.sku));
                          setLikedProducts(updated);
                          try {
                            localStorage.setItem("spresso_liked_products", JSON.stringify(updated));
                          } catch {}
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-rose-600 hover:bg-rose-600 hover:text-white transition shadow-sm cursor-pointer"
                        title="Remove from Liked"
                      >
                        <MaterialIcon icon="delete" size={15} />
                      </button>
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-[#386633] uppercase">
                          {prod.brand || prod.category || "E-Commerce"}
                        </span>
                        <h4 className="font-bold text-xs text-[#18211e] mt-1 line-clamp-1">{prod.name}</h4>
                      </div>

                      <div className="pt-2 border-t border-[#f2f8f2] flex items-center justify-between">
                        <span className="text-sm font-mono font-bold text-[#386633]">
                          ${typeof prod.price === "number" ? prod.price.toFixed(2) : prod.price || "14.99"}
                        </span>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => onSelectTryOn(prod)}
                            className="px-2 py-1 bg-[#e8f3e8] hover:bg-[#386633] text-[#386633] hover:text-white rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center space-x-0.5"
                            title="Virtual Try-On"
                          >
                            <MaterialIcon icon="styler" size={12} />
                            <span>Try On</span>
                          </button>

                          <button
                            onClick={() => handleCheckoutProduct(prod)}
                            className="px-2.5 py-1 bg-[#386633] hover:bg-[#2c5227] text-white rounded-lg text-[10px] font-bold cursor-pointer transition"
                          >
                            Buy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SAVED FAVORITE OUTFITS */}
      {/* ========================================================================= */}
      {activeTab === "SAVED_OUTFITS" && (
        <div className="space-y-4 animate-fadeIn">
          {savedFavoriteOutfits.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#d8ebd7] text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 bg-[#f2f8f2] text-[#386633] rounded-2xl flex items-center justify-center mx-auto">
                <MaterialIcon icon="star" size={28} />
              </div>
              <h3 className="text-sm font-bold text-[#18211e]">No Saved Favorite Outfits Yet</h3>
              <p className="text-xs text-[#5e635f] max-w-sm mx-auto">
                Generate outfits with the AI Weather Generator or build custom looks in Mix & Match to save them here!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedFavoriteOutfits.map(outfit => (
                <div key={outfit.id} className="bg-white p-5 rounded-3xl border border-[#d8ebd7] space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#386633] bg-[#e8f3e8] px-2 py-0.5 rounded-md">
                        {outfit.temperatureText}
                      </span>
                      <h4 className="font-bold text-sm text-[#18211e] mt-1">{outfit.title}</h4>
                    </div>

                    <button
                      onClick={() => setSavedFavoriteOutfits(prev => prev.filter(o => o.id !== outfit.id))}
                      className="p-1.5 rounded-full text-red-600 hover:bg-red-50 cursor-pointer"
                      title="Remove from favorites"
                    >
                      <MaterialIcon icon="delete" size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {outfit.items.map(it => (
                      <div key={it.id} className="aspect-square rounded-xl overflow-hidden bg-[#f2f8f2] border border-[#d8ebd7]">
                        <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-[#5e635f] bg-[#f2f8f2] p-3 rounded-xl leading-relaxed">
                    {outfit.stylingAdvice}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHOTO / CAMERA UPLOAD MODAL */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-[#d8ebd7] shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#f2f8f2] pb-3">
              <div className="flex items-center space-x-2 text-[#386633]">
                <MaterialIcon icon="add_a_photo" size={22} />
                <h3 className="font-bold text-base text-[#18211e]">Add Personal Clothing Item</h3>
              </div>
              <button
                onClick={() => { setShowUploadModal(false); setUploadPreview(null); }}
                className="p-1 text-[#5e635f] hover:text-[#18211e] cursor-pointer"
              >
                <MaterialIcon icon="close" size={20} />
              </button>
            </div>

            {/* Photo Capture / Select Buttons */}
            <div className="space-y-3">
              {uploadPreview ? (
                <div className="relative aspect-square w-48 mx-auto rounded-2xl overflow-hidden border border-[#d8ebd7] shadow-xs">
                  <img src={uploadPreview} alt="Upload Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setUploadPreview(null)}
                    className="absolute top-2 right-2 p-1 bg-black/70 text-white rounded-full hover:bg-black cursor-pointer"
                  >
                    <MaterialIcon icon="close" size={16} />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-[#d8ebd7] hover:border-[#386633] rounded-2xl p-6 text-center space-y-3 transition bg-[#f9fbf9]">
                  <div className="w-12 h-12 bg-[#e8f3e8] text-[#386633] rounded-full flex items-center justify-center mx-auto">
                    <MaterialIcon icon="camera_alt" size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#18211e]">Snap Photo or Pick from Gallery</p>
                    <p className="text-[11px] text-[#5e635f]">Upload shirts, sweaters, jeans, shoes or jackets from your closet</p>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-4 py-2 bg-[#386633] text-white rounded-xl text-xs font-bold hover:bg-[#2c5227] transition cursor-pointer flex items-center space-x-1"
                    >
                      <MaterialIcon icon="photo_camera" size={16} />
                      <span>Take Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white text-[#386633] border border-[#d8ebd7] hover:bg-[#e8f3e8] rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1"
                    >
                      <MaterialIcon icon="photo_library" size={16} />
                      <span>Photo Gallery</span>
                    </button>
                  </div>

                  {/* Hidden Input File Trigger */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}

              {/* Form Inputs */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[#18211e] mb-1">Item Title / Name</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    placeholder="E.g. Vintage Wool Sweater or Summer Shorts"
                    className="w-full bg-[#f9fbf9] border border-[#d8ebd7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#386633]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#18211e] mb-1">Category</label>
                    <select
                      value={uploadCategory}
                      onChange={e => setUploadCategory(e.target.value as any)}
                      className="w-full bg-[#f9fbf9] border border-[#d8ebd7] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#386633]"
                    >
                      <option value="TOP">Top / Shirt</option>
                      <option value="BOTTOM">Bottom / Pants</option>
                      <option value="SWEATER_OUTERWEAR">Sweater / Outerwear</option>
                      <option value="DRESS">Dress</option>
                      <option value="SHOES">Shoes / Footwear</option>
                      <option value="ACCESSORY">Accessory</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#18211e] mb-1">Suitable Weather</label>
                    <select
                      value={uploadWeather}
                      onChange={e => setUploadWeather(e.target.value as any)}
                      className="w-full bg-[#f9fbf9] border border-[#d8ebd7] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#386633]"
                    >
                      <option value="HOT_SUMMER">☀️ Hot / Summer</option>
                      <option value="COLD_WINTER">❄️ Cold / Winter</option>
                      <option value="MILD_SPRING_AUTUMN">🍂 Mild Spring/Autumn</option>
                      <option value="ALL_WEATHER">🌈 All Weathers</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#18211e] mb-1">Color / Tone (Optional)</label>
                  <input
                    type="text"
                    value={uploadColor}
                    onChange={e => setUploadColor(e.target.value)}
                    placeholder="E.g. Beige, Navy Blue, Black"
                    className="w-full bg-[#f9fbf9] border border-[#d8ebd7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#386633]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#f2f8f2] flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-xs font-bold rounded-xl text-[#5e635f] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveUploadedItem}
                disabled={!uploadPreview}
                className="px-5 py-2 bg-[#386633] hover:bg-[#2c5227] text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Save to Personal Closet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLOT SELECTION DRAWER MODAL FOR MIX & MATCH */}
      {/* ========================================================================= */}
      {slotDrawerCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-[#d8ebd7] shadow-xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#f2f8f2] pb-3">
              <h3 className="font-bold text-base text-[#18211e]">
                Select {slotDrawerCategory.replace("_", " ")} Item
              </h3>
              <button onClick={() => setSlotDrawerCategory(null)} className="p-1 text-[#5e635f] hover:text-[#18211e]">
                <MaterialIcon icon="close" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 pr-1">
              {allWardrobeItems
                .filter(i => i.category === slotDrawerCategory)
                .map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (slotDrawerCategory === "TOP" || slotDrawerCategory === "DRESS") setMixMatchTop(item);
                      if (slotDrawerCategory === "SWEATER_OUTERWEAR") setMixMatchOuter(item);
                      if (slotDrawerCategory === "BOTTOM") setMixMatchBottom(item);
                      if (slotDrawerCategory === "SHOES" || slotDrawerCategory === "ACCESSORY") setMixMatchShoes(item);
                      setSlotDrawerCategory(null);
                    }}
                    className="bg-[#f9fbf9] p-3 rounded-2xl border border-[#d8ebd7] hover:border-[#386633] text-left transition cursor-pointer flex flex-col justify-between space-y-2 group"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-white border border-[#d8ebd7]">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    </div>
                    <h5 className="font-bold text-xs text-[#18211e] line-clamp-1">{item.name}</h5>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
