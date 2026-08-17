import { useState, useEffect } from "react";
import { authFetch } from "../lib/firebase";
import { ProductItem, HITLPayload } from "../types";
import { CustomWardrobeItem, GeneratedOutfit, WardrobeCategory, WeatherSuitability } from "../types";

const INITIAL_PHOTO_GALLERY_ITEMS: CustomWardrobeItem[] = [];

const SEED_PHOTO_GALLERY_ITEMS: CustomWardrobeItem[] = [
  {
    id: "gallery-seed-1",
    type: "user_upload",
    name: "Classic Beige Cable Knit Sweater",
    category: "SWEATER_OUTERWEAR",
    weatherSuitability: "COLD_WINTER",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80",
    brand: "Zara Vault",
    price: 89.00,
    addedAt: Date.now() - 4000
  },
  {
    id: "gallery-seed-2",
    type: "user_upload",
    name: "Urban Relaxed Cargo Pants",
    category: "BOTTOM",
    weatherSuitability: "ALL_WEATHER",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80",
    brand: "Levi's Gallery",
    price: 110.00,
    addedAt: Date.now() - 3000
  },
  {
    id: "gallery-seed-3",
    type: "user_upload",
    name: "Retro Court Leather Sneakers",
    category: "SHOES",
    weatherSuitability: "ALL_WEATHER",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80",
    brand: "Nike Premium",
    price: 120.00,
    addedAt: Date.now() - 2000
  },
  {
    id: "gallery-seed-4",
    type: "user_upload",
    name: "Casual Breathable Linen Tee",
    category: "TOP",
    weatherSuitability: "HOT_SUMMER",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
    brand: "Everlane Gallery",
    price: 35.00,
    addedAt: Date.now() - 1000
  },
  {
    id: "gallery-seed-5",
    type: "user_upload",
    name: "Classic Heavy Wool Trench Coat",
    category: "SWEATER_OUTERWEAR",
    weatherSuitability: "COLD_WINTER",
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=80",
    brand: "Burberry Vault",
    price: 650.00,
    addedAt: Date.now()
  }
];

export function useWardrobeState(products: ProductItem[], onRequestHITLCheckout: (payload: HITLPayload) => void) {
  const [activeTab, setActiveTab] = useState<"STACKED_DECKS" | "ALL" | "SEASONAL" | "PHOTO_GALLERY" | "BOOKMARKS" | "LIKED" | "AI_OUTFIT" | "MIX_MATCH" | "SAVED_OUTFITS">("STACKED_DECKS");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedWeatherFilter, setSelectedWeatherFilter] = useState<string>("ALL");
  const [photoGalleryPermission, setPhotoGalleryPermission] = useState<"UNDETERMINED" | "GRANTED" | "DENIED">("UNDETERMINED");
  const [bookmarkedProductIds, setBookmarkedProductIds] = useState<string[]>([]);
  const [likedProducts, setLikedProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const [prefsRes, likesRes, bookmarksRes] = await Promise.all([
          authFetch("/api/user/preferences"),
          authFetch("/api/user/likes"),
          authFetch("/api/user/bookmarks")
        ]);
        
        if (prefsRes.ok) {
          const { preferences } = await prefsRes.json();
          if (preferences?.galleryPermission === "GRANTED" || preferences?.galleryPermission === "DENIED") {
            setPhotoGalleryPermission(preferences.galleryPermission);
          }
          if (preferences?.customWardrobeItems) setUserUploadedItems(preferences.customWardrobeItems);
          if (preferences?.favoriteOutfits) setSavedFavoriteOutfits(preferences.favoriteOutfits);
        }

        if (likesRes.ok) {
          const data = await likesRes.json();
          // Map likes back to full products if possible, or just keep product IDs
          // ElevatedQuickActionFab needs to know if liked. WardrobeLikedTab needs full objects.
          // For now, we assume backend gives `{ productId, ... }` and we map it if we can
          // Actually, if we must have full objects, let's just use the `products` list.
          const likedIds = data.likes?.map((l: any) => l.productId) || [];
          const fullLikes = products.filter(p => likedIds.includes(p.id));
          setLikedProducts(fullLikes);
        }

        if (bookmarksRes.ok) {
          const data = await bookmarksRes.json();
          setBookmarkedProductIds(data.bookmarks?.map((b: any) => b.productId) || []);
        }
      } catch (err) {
        console.error("Failed to sync wardrobe state from backend:", err);
      }
    };
    fetchState();
  }, [products]);

  const [userUploadedItems, setUserUploadedItems] = useState<CustomWardrobeItem[]>(INITIAL_PHOTO_GALLERY_ITEMS);
  const [savedFavoriteOutfits, setSavedFavoriteOutfits] = useState<GeneratedOutfit[]>([]);

  // Sync back preferences changes
  useEffect(() => {
    // debounce or just fire and forget
    if (userUploadedItems.length === 0 && savedFavoriteOutfits.length === 0 && photoGalleryPermission === "UNDETERMINED") return;
    authFetch("/api/user/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customWardrobeItems: userUploadedItems,
        favoriteOutfits: savedFavoriteOutfits,
        galleryPermission: photoGalleryPermission
      })
    }).catch(console.error);
  }, [userUploadedItems, savedFavoriteOutfits, photoGalleryPermission]);

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
      if (p.name.toLowerCase().includes("jean") || p.name.toLowerCase().includes("pant") || p.name.toLowerCase().includes("short")) cat = "BOTTOM";
      else if (p.name.toLowerCase().includes("sweater") || p.name.toLowerCase().includes("jacket") || p.name.toLowerCase().includes("coat")) cat = "SWEATER_OUTERWEAR";
      else if (p.name.toLowerCase().includes("shoe") || p.name.toLowerCase().includes("boot") || p.name.toLowerCase().includes("sneaker")) cat = "SHOES";
      else if (p.name.toLowerCase().includes("dress")) cat = "DRESS";
      else if (catUpper.includes("ACCESSORIES")) cat = "ACCESSORY";

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

  const allWardrobeItems: CustomWardrobeItem[] = [...userUploadedItems, ...bookmarkedWardrobeItems];

  const filteredItems = allWardrobeItems.filter(item => {
    if (activeTab === "PHOTO_GALLERY" && item.type !== "user_upload") return false;
    if (activeTab === "BOOKMARKS" && item.type !== "bookmarked_product") return false;
    if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false;
    if (selectedWeatherFilter !== "ALL" && item.weatherSuitability !== selectedWeatherFilter && item.weatherSuitability !== "ALL_WEATHER") return false;
    return true;
  });

  const handleDeleteItem = (item: CustomWardrobeItem) => {
    if (item.type === "user_upload") {
      setUserUploadedItems(prev => prev.filter(i => i.id !== item.id));
    } else if (item.type === "bookmarked_product" && item.productId) {
      const updated = bookmarkedProductIds.filter(id => id !== item.productId);
      setBookmarkedProductIds(updated);
      authFetch("/api/user/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: item.productId, action: "remove" })
      }).catch(console.error);
    }
  };

  const handleCheckoutProduct = (product: ProductItem) => {
    const payload: HITLPayload = {
      authorizationId: `ORDER-${Date.now().toString(36).toUpperCase()}`,
      product: {
        id: product.id, name: product.name, price: product.price, sku: product.sku, image: product.image
      },
      quantity: 1, totalAmount: product.price, currency: product.currency,
      deviceSource: "WEB", inventoryConfirmed: product.stock > 0, stockRemaining: product.stock,
      humanInTheLoopChallenge: {
        title: "Confirm Purchase",
        message: `Authorize $${product.price.toFixed(2)} for ${product.name}?`,
        safetyChecks: ["Reserved from personal closet wardrobe", "Includes free express shipping", "Click confirm to place order"]
      }
    };
    onRequestHITLCheckout(payload);
  };

  const grantGalleryPermission = () => {
    setPhotoGalleryPermission("GRANTED");
    setUserUploadedItems(prev => {
      const hasSeeds = prev.some(item => item.id.startsWith("gallery-seed-"));
      if (!hasSeeds) {
        return [...SEED_PHOTO_GALLERY_ITEMS, ...prev];
      }
      return prev;
    });
  };

  const denyGalleryPermission = () => {
    setPhotoGalleryPermission("DENIED");
  };

  return {
    activeTab, setActiveTab,
    selectedCategory, setSelectedCategory,
    selectedWeatherFilter, setSelectedWeatherFilter,
    bookmarkedProductIds, setBookmarkedProductIds,
    likedProducts, setLikedProducts,
    userUploadedItems, setUserUploadedItems,
    savedFavoriteOutfits, setSavedFavoriteOutfits,
    bookmarkedWardrobeItems, allWardrobeItems, filteredItems,
    handleDeleteItem, handleCheckoutProduct,
    photoGalleryPermission, setPhotoGalleryPermission,
    grantGalleryPermission, denyGalleryPermission
  };
}
