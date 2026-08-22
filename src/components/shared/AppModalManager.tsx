import React from "react";
import { ProductItem, HITLPayload } from "../../types";
import { HITLCheckoutModal } from "../HITLCheckoutModal";
import { ProductDetailsModal } from "../ProductDetailsModal";
import { GoogleLensScreenWidgetModal } from "../GoogleLensScreenWidgetModal";
import { GamifiedOnboardingModal } from "../GamifiedOnboardingModal";
import { LocationPermissionModal } from "../LocationPermissionModal";
import { CartDrawer } from "../CartDrawer";
import { DynamicThemePickerModal } from "../DynamicThemePickerModal";

interface AppModalManagerProps {
  cart: any[];
  cartDrawerOpen: boolean;
  onCloseCartDrawer: () => void;
  onUpdateCartQuantity: (productId: string, delta: number) => void;
  onRemoveCartItem: (productId: string) => void;
  onClearCart: () => void;
  onRequestHITLCheckout: (payload: HITLPayload) => void;

  locationModalOpen: boolean;
  userLocation: string | null;
  searchRadius: number;
  onCloseLocationModal: () => void;
  onLocationGranted: (locationName: string, coords?: { lat: number; lng: number }, searchRadius?: number) => void;
  onRadiusChange: (radius: number) => void;

  productDetailsModalItem: ProductItem | null;
  onCloseProductDetailsModal: () => void;
  onAddToCart: (product: ProductItem) => void;
  onSelectTryOn: (product: ProductItem) => void;
  onOpenLens: (product?: ProductItem | null) => void;

  lensModalOpen: boolean;
  lensInitialProduct: ProductItem | null;
  onCloseLensModal: () => void;

  onboardingOpen: boolean;
  onCloseOnboarding: () => void;
  onAskAI: (query: string, image?: string | null) => void;

  hitlPayload: HITLPayload | null;
  onCloseHITLCheckout: () => void;

  dynamicThemeModalOpen: boolean;
  theme: "light" | "dark";
  seedHex: string;
  secondarySeedHex?: string;
  onCloseDynamicThemeModal: () => void;
  onSelectSeedHex: (primaryHex: string, secondaryHex?: string) => void;
  onToggleTheme: () => void;
}

export const AppModalManager: React.FC<AppModalManagerProps> = ({
  cart,
  cartDrawerOpen,
  onCloseCartDrawer,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onClearCart,
  onRequestHITLCheckout,
  locationModalOpen,
  userLocation,
  searchRadius,
  onCloseLocationModal,
  onLocationGranted,
  onRadiusChange,
  productDetailsModalItem,
  onCloseProductDetailsModal,
  onAddToCart,
  onSelectTryOn,
  onOpenLens,
  lensModalOpen,
  lensInitialProduct,
  onCloseLensModal,
  onboardingOpen,
  onCloseOnboarding,
  onAskAI,
  hitlPayload,
  onCloseHITLCheckout,
  dynamicThemeModalOpen,
  theme,
  seedHex,
  secondarySeedHex,
  onCloseDynamicThemeModal,
  onSelectSeedHex,
  onToggleTheme
}) => {
  return (
    <>
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={onCloseCartDrawer}
        cart={cart}
        onUpdateQuantity={onUpdateCartQuantity}
        onRemoveItem={onRemoveCartItem}
        onClearCart={onClearCart}
        onRequestHITLCheckout={onRequestHITLCheckout}
      />

      {locationModalOpen && (
        <LocationPermissionModal
          userLocation={userLocation}
          searchRadius={searchRadius}
          onClose={onCloseLocationModal}
          onLocationGranted={onLocationGranted}
          onRadiusChange={onRadiusChange}
        />
      )}

      {productDetailsModalItem && (
        <ProductDetailsModal
          product={productDetailsModalItem}
          onClose={onCloseProductDetailsModal}
          onAddToCart={onAddToCart}
          onRequestHITLCheckout={onRequestHITLCheckout}
          onOpenLens={onOpenLens}
        />
      )}

      {lensModalOpen && (
        <GoogleLensScreenWidgetModal
          initialProduct={lensInitialProduct}
          onClose={onCloseLensModal}
          onSelectTryOn={onSelectTryOn}
        />
      )}

      {onboardingOpen && (
        <GamifiedOnboardingModal
          onClose={onCloseOnboarding}
          onAskAI={onAskAI}
          onSelectTryOn={onSelectTryOn}
        />
      )}

      {hitlPayload && (
        <HITLCheckoutModal
          payload={hitlPayload}
          onClose={onCloseHITLCheckout}
          onOrderConfirmed={() => {
            onCloseHITLCheckout();
            onClearCart();
          }}
        />
      )}

      {dynamicThemeModalOpen && (
        <DynamicThemePickerModal
          onClose={onCloseDynamicThemeModal}
          currentSeedHex={seedHex}
          currentSecondarySeedHex={secondarySeedHex}
          onSelectSeedHex={onSelectSeedHex}
          mode={theme}
          onToggleMode={onToggleTheme}
        />
      )}
    </>
  );
};
