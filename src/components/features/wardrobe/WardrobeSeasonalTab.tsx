import React from "react";
import { ProductItem, HITLPayload, CustomWardrobeItem } from "../../../types";
import { SeasonalCategorySection } from "../../SeasonalCategorySection";

interface WardrobeSeasonalTabProps {
  allWardrobeItems: CustomWardrobeItem[];
  products: ProductItem[];
  onSelectTryOn: (product: ProductItem) => void;
  onGoToMixMatch: () => void;
}

export const WardrobeSeasonalTab: React.FC<WardrobeSeasonalTabProps> = ({
  allWardrobeItems, products, onSelectTryOn, onGoToMixMatch
}) => {
  const handlePrimaryAction = (item: CustomWardrobeItem) => {
    if (item.productId) {
      const found = products.find(p => p.id === item.productId);
      if (found) onSelectTryOn(found);
    } else {
      onGoToMixMatch();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <SeasonalCategorySection
        title="Solstice Sun & Linen Collection"
        subtitle="Breathable linen shirts, breezy dresses, tailored shorts & UV resortwear for warm days"
        seasonLabel="For hot summer weather"
        seasonTheme="summer"
        items={allWardrobeItems.filter(i =>
          i.weatherSuitability === "HOT_SUMMER" || i.name.toLowerCase().includes("linen") || i.name.toLowerCase().includes("short") || i.name.toLowerCase().includes("summer")
        )}
        onPrimaryAction={handlePrimaryAction}
      />

      <SeasonalCategorySection
        title="Alpine Frost & Cashmere Haven"
        subtitle="Chunky knit sweaters, tailored wool coats, thermal denim & insulated winter boots"
        seasonLabel="For cold winter weather"
        seasonTheme="winter"
        items={allWardrobeItems.filter(i =>
          i.weatherSuitability === "COLD_WINTER" || i.category === "SWEATER_OUTERWEAR" || i.name.toLowerCase().includes("sweater") || i.name.toLowerCase().includes("coat") || i.name.toLowerCase().includes("jacket")
        )}
        onPrimaryAction={handlePrimaryAction}
      />

      <SeasonalCategorySection
        title="Autumn Ember & Tweed Ensemble"
        subtitle="Layered cardigans, rich earth-tone denim, leather jackets & transitional footwear"
        seasonLabel="For mild autumn weather"
        seasonTheme="autumn"
        items={allWardrobeItems.filter(i =>
          i.weatherSuitability === "MILD_SPRING_AUTUMN" || i.category === "BOTTOM" || i.name.toLowerCase().includes("denim") || i.name.toLowerCase().includes("jean")
        )}
        onPrimaryAction={handlePrimaryAction}
      />

      <SeasonalCategorySection
        title="Vernal Bloom & Silk Promenade"
        subtitle="Pastel silks, flowy skirts, floral blouses & clean crisp spring footwear"
        seasonLabel="For spring weather"
        seasonTheme="spring"
        items={allWardrobeItems.filter(i => i.category === "DRESS" || i.category === "ACCESSORY" || i.weatherSuitability === "ALL_WEATHER")}
        onPrimaryAction={handlePrimaryAction}
      />
    </div>
  );
};
