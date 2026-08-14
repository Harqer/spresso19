import React, { useState, useEffect } from "react";
import { ProductItem, HITLPayload, OrderRecord, CartItem } from "./types";
import { PersonalAIShopperChatPage as PersonalAIShopperChat } from "./components/features/chat/PersonalAIShopperChatPage";
import { SmartVisionView } from "./components/SmartVisionView";
import { ProductCatalogPage as ProductCatalog } from "./components/features/catalog/ProductCatalogPage";
import { WardrobeViewPage as WardrobeView } from "./components/features/wardrobe/WardrobeViewPage";
import { VirtualTryOnModal } from "./components/VirtualTryOnModal";
import { HITLCheckoutModal } from "./components/HITLCheckoutModal";
import { OrdersTracker } from "./components/OrdersTracker";
import { GroceryListView } from "./components/GroceryListView";
import { CreatorGenAIAgentsChatPage as CreatorGenAIAgentsChat } from "./components/features/chat/CreatorGenAIAgentsChatPage";
import { TravelTripsPage } from "./components/features/travel/TravelTripsPage";
import { CartDrawer } from "./components/CartDrawer";
import { LocationPermissionModal } from "./components/LocationPermissionModal";
import { ProductDetailsModal } from "./components/ProductDetailsModal";
import { GoogleLensScreenWidgetModal } from "./components/GoogleLensScreenWidgetModal";
import { GamifiedOnboardingModal } from "./components/GamifiedOnboardingModal";
import { SplashScreen } from "./components/SplashScreen";
import { SpressoLogo } from "./components/SpressoLogo";
import { MaterialIcon } from "./components/MaterialIcon";
import { AuthScreen } from "./components/AuthScreen";
import { DynamicThemePickerModal } from "./components/DynamicThemePickerModal";
import { applyDynamicThemeToDocument } from "./lib/dynamicColorEngine";
import { getCleanDisplayName } from "./lib/userUtils";
import { auth, loginWithGoogle, loginAnonymously, logoutUser, db as firestoreDb, authFetch } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { dataConnect } from "./lib/firebase";
import { listProducts } from "./dataconnect";
import { MainAppPage } from "./components/shared/MainAppPage";
import { AppModalManager } from "./components/shared/AppModalManager";
import { ProfilePage } from "./components/features/profile/ProfilePage";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    const hash = window.location.hash.replace("#", "");
    const validTabs = ["chat", "products", "scaffold", "vision", "wardrobe", "orders", "grocery", "creator", "profile"];
    return validTabs.includes(hash) ? hash : "chat";
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [pendingChatQuery, setPendingChatQuery] = useState<{ query: string; image?: string | null } | null>(null);

  // Synchronize activeTab with URL Hash
  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      const validTabs = ["chat", "products", "scaffold", "vision", "wardrobe", "orders", "grocery", "creator", "profile"];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Dynamic Light / Dark Theme & Material You Seed State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem("spresso_theme");
    return (saved === "light" || saved === "dark") ? saved : "light";
  });

  const [seedHex, setSeedHex] = useState<string>(() => {
    const saved = localStorage.getItem("spresso_seed_hex");
    if (!saved || saved.toLowerCase() === "#1e2229" || saved.toLowerCase() === "#446732") {
      return "#386633"; // Spresso Organic Green (Matches Sign Up Page)
    }
    return saved;
  });

  const [secondarySeedHex, setSecondarySeedHex] = useState<string | undefined>(() => {
    const saved = localStorage.getItem("spresso_sec_seed_hex");
    if (!saved || saved.toLowerCase() === "#84cc16" || saved.toLowerCase() === "#55624c") {
      return "#52645b"; // Spresso Secondary Container Green
    }
    return saved;
  });

  const [dynamicThemeModalOpen, setDynamicThemeModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
    localStorage.setItem("spresso_theme", theme);
    localStorage.setItem("spresso_seed_hex", seedHex);
    if (secondarySeedHex) {
      localStorage.setItem("spresso_sec_seed_hex", secondarySeedHex);
    }

    // Apply Material You Dynamic Scheme & Tokens with Charcoal source & Lime Green secondary
    applyDynamicThemeToDocument(seedHex, theme, secondarySeedHex);
  }, [theme, seedHex, secondarySeedHex]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const handleAskAI = (query: string, image?: string | null) => {
    setPendingChatQuery({ query, image });
    setActiveTab("chat");
  };

  // Real Firebase User State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState<boolean>(false);

  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [userLatLng, setUserLatLng] = useState<{ lat: number; lng: number; latitude: number; longitude: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(25);
  const [locationModalOpen, setLocationModalOpen] = useState<boolean>(false);
  const [splashVisible, setSplashVisible] = useState<boolean>(true);
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);

  useEffect(() => {
    const isCompleted = localStorage.getItem("spresso_onboarding_completed");
    if (!isCompleted && !splashVisible) {
      setOnboardingOpen(true);
    }
  }, [splashVisible]);

  const [showcaseProduct, setShowcaseProduct] = useState<ProductItem | null>(null);
  const [productDetailsModalItem, setProductDetailsModalItem] = useState<ProductItem | null>(null);
  const [lensModalOpen, setLensModalOpen] = useState<boolean>(false);
  const [lensInitialProduct, setLensInitialProduct] = useState<ProductItem | null>(null);
  const [hitlPayload, setHitlPayload] = useState<HITLPayload | null>(null);

  const handleOpenLens = (product?: ProductItem | null) => {
    setLensInitialProduct(product || null);
    setLensModalOpen(true);
  };

  const handleSelectTryOn = (prod: ProductItem) => {
    setProductDetailsModalItem(prod);
  };

  const handleAddToCart = (product: ProductItem) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const totalCartCount = cart.reduce((total, item) => total + item.quantity, 0);

  // Load Inventory & Orders from Data Connect / Cloud SQL
  const fetchInventoryAndOrders = async (targetUid?: string) => {
    try {
      const res = await authFetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.products && data.products.length > 0) {
          const fetchedProducts = data.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            price: p.price,
            likesCount: p.likesCount || 0,
            image: p.image || p.imageUrl || "",
            category: p.category || "",
            tags: p.tags || [],
            brand: p.brand || "",
            currency: p.currency || "",
            sku: p.sku || `SKU-${p.id}`,
            rating: p.rating || 5.0,
            virtualTryOnEligible: true,
            mcpServerId: "spresso-mcp-retail"
          }));
          setProducts(fetchedProducts);
          setOrders([]);
          return;
        }
      }
    } catch (err) {
      console.warn("Express products fetch failed, attempting Firebase:", err);
    }

    try {
      const response = await listProducts(dataConnect);
      if (response.data && response.data.products) {
        const dcProducts = response.data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
          price: p.price,
          likesCount: p.likesCount,
          image: p.imageUrl || p.image || "",
          category: p.category || "",
          tags: p.tags || [],
          brand: p.brand || "",
          currency: p.currency || "",
          sku: p.sku || `SKU-${p.id}`,
          rating: p.rating || 0,
          virtualTryOnEligible: true,
          mcpServerId: "spresso-mcp-retail"
        })) as unknown as ProductItem[];
        setProducts(dcProducts);
      }
      setOrders([]);
    } catch (_err) {
      // Errors fetching products are logged by the Crashlytics sink in firebase.ts
    }
  };

  useEffect(() => {
    // Auto-prompt location modal on initial load if location is not yet set
    if (!userLocation && !localStorage.getItem("spresso_loc_prompted")) {
      setLocationModalOpen(true);
      localStorage.setItem("spresso_loc_prompted", "true");
    }

    // Subscribe to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setAuthLoading(false);

        const displayName = getCleanDisplayName(currentUser);

        try {
          // 1. Sync profile to Cloud SQL backend via authenticated API
          await authFetch("/api/user/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: currentUser.email || "",
              name: displayName
            })
          });

          // 2. Sync profile to Firestore directly for client-side reactive access
          await setDoc(doc(firestoreDb, "users", currentUser.uid), {
            uid: currentUser.uid,
            email: currentUser.email || "",
            name: displayName,
            photoURL: currentUser.photoURL || "",
            isAnonymous: currentUser.isAnonymous,
            lastLoginAt: new Date().toISOString()
          }, { merge: true });
        } catch (_err) {
          // Profile sync errors are non-fatal; user remains authenticated
        }
        fetchInventoryAndOrders(currentUser.uid);
      } else {
        // User is not signed in - enforce sign-in gate
        setUser(null);
        setAuthLoading(false);
        fetchInventoryAndOrders(undefined);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleOrderSuccess = (newOrder: OrderRecord) => {
    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    setActiveTab("orders");
    fetchInventoryAndOrders(user?.uid);
  };

  const navItems = [
    { id: "chat", label: "Chat", icon: "forum" },
    { id: "creator", label: "Creator", icon: "deployed_code_account" },
    { id: "travel", label: "Travel & Expenses", icon: "flight_takeoff" },
    { id: "products", label: "For You", icon: "recommend" },
    { id: "wardrobe", label: "Wardrobe", icon: "checkroom" },
    { id: "orders", label: "Order History", icon: "receipt_long", count: orders.length },
    { id: "grocery", label: "Grocery List", icon: "local_grocery_store" },
    { id: "profile", label: "Profile & Settings", icon: "account_circle" }
  ];

  if (splashVisible) {
    return (
      <SplashScreen
        onSplashComplete={() => {
          setSplashVisible(false);
          if (!localStorage.getItem("spresso_onboarding_completed")) {
            setOnboardingOpen(true);
          }
        }}
      />
    );
  }

  if (authLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#fafcf9] dark:bg-[#0c0e0b] flex items-center justify-center p-8 select-none">
        <SpressoLogo variant="full" height={80} showTextLeft={false} />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onDevBypass={() => {
      const dummyUser = {
        uid: "dev-dummy-user-123",
        email: "dev@localhost",
        displayName: "Dev User",
        isAnonymous: true,
        photoURL: null,
      } as unknown as User;
      setUser(dummyUser);
    }} />;
  }

  return (
    <MainAppPage
      navItems={navItems}
      activeTab={activeTab}
      sidebarOpen={sidebarOpen}
      mobileMenuOpen={mobileMenuOpen}
      userLocation={userLocation}
      searchRadius={searchRadius}
      totalCartCount={totalCartCount}
      theme={theme}
      user={user}
      onSelectTab={setActiveTab}
      onToggleSidebar={() => setSidebarOpen(prev => !prev)}
      onToggleMobileMenu={(open) => setMobileMenuOpen(open !== undefined ? open : !mobileMenuOpen)}
      onToggleTheme={toggleTheme}
      onOpenDynamicThemeModal={() => setDynamicThemeModalOpen(true)}
      onOpenLocationModal={() => setLocationModalOpen(true)}
      onOpenCartDrawer={() => setCartDrawerOpen(true)}
      onLogout={() => logoutUser()}
      hideSidebar={activeTab === 'vision' || lensModalOpen}
      hideTopNav={activeTab === 'vision' || lensModalOpen}
    >
      <div className="max-w-4xl mx-auto">
          {activeTab === "chat" && (
            <PersonalAIShopperChat
              user={user}
              userName={getCleanDisplayName(user)}
              products={products}
              onSelectTryOn={handleSelectTryOn}
              onRequestHITLCheckout={payload => setHitlPayload(payload)}
              onAddToCart={handleAddToCart}
              onOpenVisionSearch={() => setActiveTab("vision")}
              onSelectTab={tabId => setActiveTab(tabId)}
              userLocation={userLocation}
              userLatLng={userLatLng}
              searchRadius={searchRadius}
              onRadiusChange={setSearchRadius}
              onRequestLocationPermission={() => setLocationModalOpen(true)}
              deviceMode="WEB"
              pendingQuery={pendingChatQuery}
              onClearPendingQuery={() => setPendingChatQuery(null)}
              showcaseProduct={showcaseProduct}
              onClearShowcaseProduct={() => setShowcaseProduct(null)}
            />
          )}

          {activeTab === "travel" && (
            <TravelTripsPage onAskAI={handleAskAI} />
          )}

          {activeTab === "products" && (
            <ProductCatalog
              products={products}
              onSelectTryOn={handleSelectTryOn}
              onRequestHITLCheckout={payload => setHitlPayload(payload)}
              onAddToCart={handleAddToCart}
              userLocation={userLocation}
              searchRadius={searchRadius}
              onRadiusChange={setSearchRadius}
              onRequestLocationPermission={() => setLocationModalOpen(true)}
              deviceMode="WEB"
              onAskAI={handleAskAI}
              onOpenLens={handleOpenLens}
            />
          )}

          {activeTab === "vision" && (
            <SmartVisionView
              deviceMode="WEB"
              onSelectTryOn={handleSelectTryOn}
              onRequestHITLCheckout={payload => setHitlPayload(payload)}
              products={products}
              onAskAI={handleAskAI}
            />
          )}

          {activeTab === "wardrobe" && (
            <WardrobeView
              products={products}
              onSelectTryOn={handleSelectTryOn}
              onRequestHITLCheckout={payload => setHitlPayload(payload)}
              onAskAI={handleAskAI}
            />
          )}

          {activeTab === "orders" && (
            <OrdersTracker
              orders={orders}
              onAskAI={handleAskAI}
              onRefreshOrders={() => fetchInventoryAndOrders(user?.uid)}
            />
          )}

          {activeTab === "grocery" && (
            <GroceryListView
              onAddToCart={handleAddToCart}
              products={products}
              onAskAI={handleAskAI}
              searchRadius={searchRadius}
              onRadiusChange={setSearchRadius}
            />
          )}

          {activeTab === "creator" && (
            <CreatorGenAIAgentsChat
              user={user}
              userName={getCleanDisplayName(user)}
              products={products}
              userLocation={userLocation}
              onRequestLocationPermission={() => setLocationModalOpen(true)}
              onAskAI={handleAskAI}
            />
          )}

          {activeTab === "profile" && (
            <ProfilePage
              user={user}
              theme={theme}
              onToggleTheme={toggleTheme}
              onLogout={() => logoutUser()}
            />
          )}
        </div>

      <AppModalManager
        cart={cart}
        cartDrawerOpen={cartDrawerOpen}
        onCloseCartDrawer={() => setCartDrawerOpen(false)}
        onUpdateCartQuantity={handleUpdateCartQuantity}
        onRemoveCartItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onRequestHITLCheckout={payload => setHitlPayload(payload)}
        locationModalOpen={locationModalOpen}
        userLocation={userLocation}
        searchRadius={searchRadius}
        onCloseLocationModal={() => setLocationModalOpen(false)}
        onLocationGranted={(loc, coords, radius) => {
          setUserLocation(loc);
          if (coords) setUserLatLng({ lat: coords.lat, lng: coords.lng, latitude: coords.lat, longitude: coords.lng });
          if (radius) setSearchRadius(radius);
        }}
        onRadiusChange={setSearchRadius}
        productDetailsModalItem={productDetailsModalItem}
        onCloseProductDetailsModal={() => setProductDetailsModalItem(null)}
        onAddToCart={handleAddToCart}
        onSelectTryOn={handleSelectTryOn}
        onOpenLens={handleOpenLens}
        lensModalOpen={lensModalOpen}
        lensInitialProduct={lensInitialProduct}
        onCloseLensModal={() => setLensModalOpen(false)}
        onboardingOpen={onboardingOpen}
        onCloseOnboarding={() => setOnboardingOpen(false)}
        onAskAI={handleAskAI}
        hitlPayload={hitlPayload}
        onCloseHITLCheckout={() => setHitlPayload(null)}
        dynamicThemeModalOpen={dynamicThemeModalOpen}
        theme={theme}
        seedHex={seedHex}
        secondarySeedHex={secondarySeedHex}
        onCloseDynamicThemeModal={() => setDynamicThemeModalOpen(false)}
        onSelectSeedHex={(hex, secHex) => {
          setSeedHex(hex);
          setSecondarySeedHex(secHex);
        }}
        onToggleTheme={toggleTheme}
      />
    </MainAppPage>
  );
}
