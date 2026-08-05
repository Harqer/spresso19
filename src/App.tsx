import React, { useState, useEffect } from "react";
import { ProductItem, HITLPayload, OrderRecord, CartItem } from "./types";
import { PersonalAIShopperChat } from "./components/PersonalAIShopperChat";
import { SmartVisionView } from "./components/SmartVisionView";
import { ProductCatalog } from "./components/ProductCatalog";
import { WardrobeView } from "./components/WardrobeView";
import { VirtualTryOnModal } from "./components/VirtualTryOnModal";
import { HITLCheckoutModal } from "./components/HITLCheckoutModal";
import { OrdersTracker } from "./components/OrdersTracker";
import { GroceryListView } from "./components/GroceryListView";
import { CreatorGenAIAgentsChat } from "./components/CreatorGenAIAgentsChat";
import { CartDrawer } from "./components/CartDrawer";
import { LocationPermissionModal } from "./components/LocationPermissionModal";
import { ProductDetailsModal } from "./components/ProductDetailsModal";
import { GoogleLensScreenWidgetModal } from "./components/GoogleLensScreenWidgetModal";
import { SpressoLogo } from "./components/SpressoLogo";
import { MaterialIcon } from "./components/MaterialIcon";
import { AuthScreen } from "./components/AuthScreen";
import { testConnection, auth, loginWithGoogle, loginAnonymously, logoutUser, db as firestoreDb } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [pendingChatQuery, setPendingChatQuery] = useState<{ query: string; image?: string | null } | null>(null);

  // Dynamic Light / Dark Theme State (Jetpack Compose Material 3 standard)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem("spresso_theme");
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("spresso_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
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
  const [userLatLng, setUserLatLng] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(25);
  const [locationModalOpen, setLocationModalOpen] = useState<boolean>(false);

  const [tryOnProduct, setTryOnProduct] = useState<ProductItem | null>(null);
  const [showcaseProduct, setShowcaseProduct] = useState<ProductItem | null>(null);
  const [productDetailsModalItem, setProductDetailsModalItem] = useState<ProductItem | null>(null);
  const [lensModalOpen, setLensModalOpen] = useState<boolean>(false);
  const [lensInitialProduct, setLensInitialProduct] = useState<ProductItem | null>(null);
  const [hitlPayload, setHitlPayload] = useState<HITLPayload | null>(null);
  const [floatingChatOpen, setFloatingChatOpen] = useState<boolean>(false);

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

  // Load Inventory & Orders from Express Server / Cloud SQL
  const fetchInventoryAndOrders = async (targetUid?: string) => {
    try {
      const invRes = await fetch("/api/inventory");
      if (invRes.ok) {
        const contentType = invRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const invData = await invRes.json();
          if (invData.success && invData.products) {
            setProducts(invData.products);
          }
        }
      }

      const orderUrl = targetUid ? `/api/orders?userId=${encodeURIComponent(targetUid)}` : "/api/orders";
      const ordRes = await fetch(orderUrl);
      if (ordRes.ok) {
        const contentType = ordRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const ordData = await ordRes.json();
          if (ordData.success && ordData.orders) {
            setOrders(ordData.orders);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    testConnection();
    
    // Auto-prompt location modal on initial load if location is not yet set
    const timer = setTimeout(() => {
      if (!userLocation && !localStorage.getItem("spresso_loc_prompted")) {
        setLocationModalOpen(true);
        localStorage.setItem("spresso_loc_prompted", "true");
      }
    }, 1200);

    // Subscribe to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setAuthLoading(false);

        const displayName = currentUser.displayName || (currentUser.email ? currentUser.email.split("@")[0] : `User_${currentUser.uid.slice(0, 5)}`);
        try {
          // Sync profile to Cloud SQL backend
          await fetch("/api/user/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uid: currentUser.uid,
              email: currentUser.email || "",
              name: displayName,
              isAnonymous: currentUser.isAnonymous
            })
          });

          // Sync profile to Firestore
          await setDoc(doc(firestoreDb, "users", currentUser.uid), {
            uid: currentUser.uid,
            email: currentUser.email || "",
            name: displayName,
            photoURL: currentUser.photoURL || "",
            isAnonymous: currentUser.isAnonymous,
            lastLoginAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.error("User profile sync error:", err);
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
      clearTimeout(timer);
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
    { id: "creator", label: "Market & Brand Studio", icon: "deployed_code_account" },
    { id: "products", label: "For You", icon: "recommend" },
    { id: "wardrobe", label: "Wardrobe", icon: "checkroom" },
    { id: "orders", label: "Order History", icon: "receipt_long", count: orders.length },
    { id: "grocery", label: "Grocery List", icon: "local_grocery_store" }
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fafcf9] flex flex-col items-center justify-center space-y-4">
        <SpressoLogo variant="full" showTextLeft={true} size="lg" />
        <div className="flex items-center space-x-2 text-[#386633] text-sm font-semibold">
          <MaterialIcon icon="hourglass_empty" size={20} className="animate-spin" />
          <span>Authenticating...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-[#fafcf9] dark:bg-[#070d0a] text-[#18211e] dark:text-[#f8fafc] font-sans selection:bg-[#ff5e1a] selection:text-white transition-colors duration-300">
      {/* Top AppBar */}
      <header className="fixed top-0 w-full z-30 bg-white/90 dark:bg-[#0d1813]/90 backdrop-blur-md border-b border-[#d8ebd7] dark:border-[#1e382b] transition-colors duration-300">
        <div className="flex justify-between items-center px-4 md:px-6 h-16 w-full max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            {/* Mobile Menu Open Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden p-2 text-[#386633] dark:text-[#81c784] hover:bg-[#e8f3e8] dark:hover:bg-[#132a1e] rounded-xl transition cursor-pointer flex items-center justify-center"
              title="Toggle Navigation Menu"
              aria-label="Toggle Navigation Menu"
            >
              <MaterialIcon icon={mobileMenuOpen ? "close" : "menu"} size={22} />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Theme Toggle Button (Light / Dark Mode - Jetpack Compose M3 standard) */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-white dark:bg-[#0d1813] hover:bg-[#e8f3e8] dark:hover:bg-[#132a1e] text-[#386633] dark:text-[#ff6b00] transition cursor-pointer flex items-center justify-center shadow-xs"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Theme Mode"
            >
              <MaterialIcon icon={theme === 'dark' ? "light_mode" : "dark_mode"} size={20} />
            </button>

            <button
              onClick={() => setLocationModalOpen(prev => !prev)}
              className={`rounded-xl border transition cursor-pointer flex items-center space-x-1.5 px-3 py-1.5 shadow-xs ${
                userLocation
                  ? "bg-white dark:bg-[#12221b] border-[#386633]/40 dark:border-[#1e382b] hover:bg-[#e8f3e8] dark:hover:bg-[#1a3327] text-[#18211e] dark:text-[#f8fafc]"
                  : "bg-[#e8f3e8] dark:bg-[#132a1e] border-[#386633]/60 dark:border-[#388e3c]/60 hover:bg-[#386633] dark:hover:bg-[#2e7d32] hover:text-white text-[#386633] dark:text-[#81c784] font-bold"
              }`}
              title={userLocation ? `Click to adjust location & ${searchRadius}-mile search radius` : "Set location and search radius"}
            >
              <MaterialIcon icon="location_on" size={18} className="text-[#386633] dark:text-[#81c784] shrink-0" />
              <div className="flex items-center space-x-1 text-xs font-semibold">
                <span className="max-w-[120px] truncate">
                  {(() => {
                    if (!userLocation) return "Set Location";
                    if (userLocation.includes("Lat ") || userLocation.match(/Near\s+-?\d+\.\d+/i) || userLocation.match(/-?\d+\.\d+,\s*-?\d+\.\d+/)) {
                      if (userLocation.includes("San Francisco")) return "San Francisco";
                      return "Near Me";
                    }
                    return userLocation;
                  })()}
                </span>
                <span className="text-[11px] font-bold text-[#386633] dark:text-[#81c784] bg-[#e8f3e8] dark:bg-[#183324] px-1.5 py-0.5 rounded-md border border-[#d8ebd7] dark:border-[#1e382b] font-mono">
                  {searchRadius}m
                </span>
              </div>
            </button>

            <button
              onClick={() => setCartDrawerOpen(true)}
              className="relative p-2.5 rounded-xl bg-white dark:bg-[#0d1813] border border-[#386633]/30 dark:border-[#1e382b] hover:bg-[#e8f3e8] dark:hover:bg-[#132a1e] text-[#18211e] dark:text-[#f8fafc] transition cursor-pointer flex items-center justify-center shadow-xs"
              title="Shopping Cart"
              aria-label="Shopping Cart"
            >
              <MaterialIcon icon="shopping_bag" size={20} className="text-[#386633] dark:text-[#81c784]" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-[#ff5e1a] dark:bg-[#ff6b00] text-white font-mono text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {totalCartCount}
                </span>
              )}
            </button>

            {user && (
              <div className="flex items-center space-x-2 pl-1">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-[#386633]/30 dark:border-[#1e382b] object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#386633] dark:bg-[#2e7d32] text-white font-mono text-xs font-bold flex items-center justify-center shadow-xs">
                    {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => logoutUser()}
                  className="p-1.5 text-[#52645b] dark:text-[#94a3b8] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition cursor-pointer flex items-center justify-center"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <MaterialIcon icon="logout" size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Navigation Drawer Sidebar */}
      <aside
        className={`h-full fixed left-0 top-0 bg-white dark:bg-[#0d1813] border-r border-[#d8ebd7] dark:border-[#1e382b] transition-all duration-300 flex flex-col p-3 pt-3 space-y-3 ${
          mobileMenuOpen ? "translate-x-0 w-64 shadow-2xl z-50" : "-translate-x-full md:translate-x-0 z-40"
        } ${sidebarOpen ? "md:w-64" : "md:w-16"}`}
      >
        {/* Sidebar Header with Spresso Logo & Toggle/Close Icon */}
        <div className="flex items-center justify-between pb-2 border-b border-[#d8ebd7] dark:border-[#1e382b] min-h-14">
          {/* Mobile View Header: Full Logo + Close Button */}
          <div className="flex md:hidden items-center justify-between w-full">
            <SpressoLogo variant="full" showTextLeft={true} width={80} height={48} />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 text-[#386633] dark:text-[#81c784] hover:bg-[#e8f3e8] dark:hover:bg-[#132a1e] rounded-xl transition cursor-pointer"
              title="Close Menu"
              aria-label="Close Menu"
            >
              <MaterialIcon icon="close" size={22} />
            </button>
          </div>

          {/* Desktop View Header: Full Logo or Icon depending on sidebarOpen state */}
          <div className="hidden md:flex items-center justify-between w-full">
            {sidebarOpen ? (
              <div className="flex items-center justify-between w-full">
                <SpressoLogo variant="full" showTextLeft={true} width={80} height={48} />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 text-[#386633] dark:text-[#81c784] hover:bg-[#e8f3e8] dark:hover:bg-[#132a1e] rounded-xl transition cursor-pointer"
                  title="Collapse Sidebar"
                  aria-label="Collapse Sidebar"
                >
                  <MaterialIcon icon="menu_open" size={22} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-full flex items-center justify-center p-1 text-[#386633] dark:text-[#81c784] hover:bg-[#e8f3e8] dark:hover:bg-[#132a1e] rounded-xl transition cursor-pointer"
                title="Expand Sidebar"
                aria-label="Expand Sidebar"
              >
                <SpressoLogo variant="icon" size="sm" />
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 chat-scrollbar">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center ${
                  sidebarOpen ? "justify-between px-3" : "md:justify-center px-3 md:px-0"
                } py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#386633] dark:bg-[#2e7d32] text-white font-bold shadow-xs"
                    : "text-[#2d3a33] dark:text-[#94a3b8] hover:bg-[#e8f3e8] dark:hover:bg-[#132a1e] hover:text-[#386633] dark:hover:text-[#81c784]"
                }`}
                title={item.label}
              >
                <div className="flex items-center space-x-3">
                  <MaterialIcon icon={item.icon} size={20} className={isActive ? "text-white" : "text-[#386633] dark:text-[#81c784]"} />
                  <span className={`block ${sidebarOpen ? "md:block" : "md:hidden"}`}>{item.label}</span>
                </div>

                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded-full font-bold ${
                      isActive ? "bg-[#ff5e1a] dark:bg-[#ff6b00] text-white" : "bg-[#386633] dark:bg-[#2e7d32] text-white"
                    } ${sidebarOpen ? "md:inline-block" : "md:hidden"}`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="mt-auto pt-3 border-t border-[#d8ebd7] dark:border-[#1e382b]">
          {user ? (
            <div className={`flex items-center justify-between ${sidebarOpen ? "p-2 bg-[#f2f8f2] dark:bg-[#12221b]" : "md:justify-center p-2 bg-transparent"} rounded-2xl`}>
              <div className="flex items-center space-x-2.5 overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User Avatar" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-[#2c5227]/20 dark:border-[#1e382b]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#386633] dark:bg-[#2e7d32] text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-xs">
                    {(user.displayName || user.email || "S").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`overflow-hidden min-w-0 ${sidebarOpen ? "md:block" : "md:hidden"}`}>
                  <p className="text-xs font-bold text-[#18211e] dark:text-[#f8fafc] truncate">{user.displayName || "Spresso Shopper"}</p>
                  <p className="text-[10px] text-[#5e635f] dark:text-[#94a3b8] truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => logoutUser()}
                title="Sign Out"
                className={`p-1.5 text-[#5e635f] dark:text-[#94a3b8] hover:text-[#a84a32] dark:hover:text-red-400 hover:bg-[#eaf4e9] dark:hover:bg-red-950/40 rounded-lg transition-colors flex-shrink-0 ml-1 ${sidebarOpen ? "md:block" : "md:hidden"}`}
              >
                <MaterialIcon icon="logout" size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => loginWithGoogle()}
              className={`w-full flex items-center ${sidebarOpen ? "justify-center space-x-2 px-3 py-2" : "md:justify-center p-2"} bg-[#386633] dark:bg-[#2e7d32] text-white rounded-2xl text-xs font-semibold hover:bg-[#2c5227] dark:hover:bg-[#388e3c] transition-all shadow-xs`}
            >
              <MaterialIcon icon="login" size={18} />
              <span className={`block ${sidebarOpen ? "md:block" : "md:hidden"}`}>Sign in with Google</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className={`transition-all duration-300 ${
          sidebarOpen ? "md:ml-64" : "md:ml-16"
        } pt-20 px-4 md:px-8 pb-12 min-h-screen`}
      >
        <div className="max-w-4xl mx-auto">
          {activeTab === "chat" && (
            <PersonalAIShopperChat
              user={user}
              userName={user?.displayName ? user.displayName.split(" ")[0] : (user?.email ? user.email.split("@")[0] : (user?.uid ? `User_${user.uid.slice(0, 5)}` : undefined))}
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
              userName={user?.displayName ? user.displayName.split(" ")[0] : (user?.email ? user.email.split("@")[0] : undefined)}
              products={products}
              userLocation={userLocation}
              onRequestLocationPermission={() => setLocationModalOpen(true)}
              onAskAI={handleAskAI}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <VirtualTryOnModal
        product={tryOnProduct}
        onClose={() => setTryOnProduct(null)}
        onRequestHITLCheckout={payload => setHitlPayload(payload)}
        onOpenLens={handleOpenLens}
        deviceMode="WEB"
      />

      <GoogleLensScreenWidgetModal
        isOpen={lensModalOpen}
        onClose={() => setLensModalOpen(false)}
        initialProduct={lensInitialProduct}
        onSelectTryOn={(prod) => {
          setProductDetailsModalItem(prod);
          setLensModalOpen(false);
        }}
      />

      <HITLCheckoutModal
        payload={hitlPayload}
        onClose={() => setHitlPayload(null)}
        onSuccess={handleOrderSuccess}
      />

      <LocationPermissionModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        currentRadius={searchRadius}
        onRadiusChange={setSearchRadius}
        onLocationGranted={(loc, coords, radius) => {
          setUserLocation(loc);
          if (coords) {
            setUserLatLng({ latitude: coords.lat, longitude: coords.lng });
          }
          if (radius) {
            setSearchRadius(radius);
          }
        }}
      />

      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onRequestHITLCheckout={payload => setHitlPayload(payload)}
      />

      {/* Persistent Reusable AI Shopper Floating Button (Visible on all screens except full Chat view) */}
      {activeTab !== "chat" && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setFloatingChatOpen(true)}
            className="flex items-center space-x-2 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full shadow-2xl border border-neutral-700/60 transition cursor-pointer group hover:scale-105"
            title="Open AI Personal Shopper Assistant"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MaterialIcon icon="auto_awesome" size={16} className="group-hover:rotate-12 transition-transform" />
            </div>
            <span className="text-xs font-medium tracking-wide">AI Personal Shopper</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      )}

      {/* Floating AI Shopper Overlay Drawer */}
      {floatingChatOpen && activeTab !== "chat" && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-neutral-900 h-full shadow-2xl flex flex-col border-l border-neutral-800 animate-in slide-in-from-right duration-200">
            <div className="p-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MaterialIcon icon="auto_awesome" size={18} className="text-emerald-400" />
                <span className="text-sm font-medium text-white">Spresso AI Personal Shopper</span>
              </div>
              <button
                onClick={() => setFloatingChatOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
              >
                <MaterialIcon icon="close" size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PersonalAIShopperChat
                user={user}
                userName={user?.displayName ? user.displayName.split(" ")[0] : (user?.email ? user.email.split("@")[0] : undefined)}
                products={products}
                onSelectTryOn={prod => {
                  handleSelectTryOn(prod);
                  setFloatingChatOpen(false);
                }}
                onRequestHITLCheckout={payload => {
                  setHitlPayload(payload);
                  setFloatingChatOpen(false);
                }}
                onAddToCart={handleAddToCart}
                onOpenVisionSearch={() => {
                  setActiveTab("vision");
                  setFloatingChatOpen(false);
                }}
                onSelectTab={tabId => {
                  setActiveTab(tabId);
                  setFloatingChatOpen(false);
                }}
                userLocation={userLocation}
                userLatLng={userLatLng}
                onRequestLocationPermission={() => setLocationModalOpen(true)}
                deviceMode="WEB"
              />
            </div>
          </div>
        </div>
      )}

      {/* Global Product Details Sheet Modal */}
      <ProductDetailsModal
        isOpen={!!productDetailsModalItem}
        onClose={() => setProductDetailsModalItem(null)}
        product={productDetailsModalItem}
        onAddToCart={(prod, qty, sz) => {
          for (let i = 0; i < qty; i++) {
            handleAddToCart({
              ...prod,
              name: sz ? `${prod.name} (${sz})` : prod.name
            });
          }
        }}
        onRequestHITLCheckout={payload => setHitlPayload(payload)}
      />
    </div>
  );
}
