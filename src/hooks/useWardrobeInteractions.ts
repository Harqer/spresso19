import React, { useState, useRef, useEffect } from "react";
import { CustomWardrobeItem, GeneratedOutfit, WardrobeCategory, WeatherSuitability } from "../types";
import { authFetch } from "../lib/firebase";

export function useWardrobeInteractions(allWardrobeItems: CustomWardrobeItem[], setUserUploadedItems: React.Dispatch<React.SetStateAction<CustomWardrobeItem[]>>, setCurrentOutfit: React.Dispatch<React.SetStateAction<GeneratedOutfit | null>>) {
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [uploadCategory, setUploadCategory] = useState<WardrobeCategory>("TOP");
  const [uploadWeather, setUploadWeather] = useState<WeatherSuitability>("HOT_SUMMER");
  const [uploadColor, setUploadColor] = useState<string>("");

  const [selectedWeatherMode, setSelectedWeatherMode] = useState<"HOT_SUMMER" | "COLD_WINTER" | "MILD_SPRING_AUTUMN">("COLD_WINTER");
  const [temperaturePrompt, setTemperaturePrompt] = useState<string>("38°F Chilly Winter Day");
  const [isGeneratingOutfit, setIsGeneratingOutfit] = useState<boolean>(false);

  const [mixMatchTop, setMixMatchTop] = useState<CustomWardrobeItem | null>(null);
  const [mixMatchBottom, setMixMatchBottom] = useState<CustomWardrobeItem | null>(null);
  const [mixMatchOuter, setMixMatchOuter] = useState<CustomWardrobeItem | null>(null);
  const [mixMatchShoes, setMixMatchShoes] = useState<CustomWardrobeItem | null>(null);
  const [slotDrawerCategory, setSlotDrawerCategory] = useState<WardrobeCategory | null>(null);

  const handleSaveUploadedItem = () => {
    if (!uploadPreview) return;
    const newItem: CustomWardrobeItem = {
      id: `upload-${Date.now()}`, type: "user_upload", name: uploadTitle || "My Gallery Clothes",
      category: uploadCategory, weatherSuitability: uploadWeather, image: uploadPreview, color: uploadColor || undefined,
      brand: "Photo Gallery Upload", addedAt: Date.now()
    };
    setUserUploadedItems(prev => [newItem, ...prev]);
    setShowUploadModal(false); setUploadPreview(null); setUploadTitle(""); setUploadColor("");
  };



  const handleGenerateAIOutfit = async (mode = selectedWeatherMode, tempText = temperaturePrompt) => {
    setIsGeneratingOutfit(true);
    try {
      const response = await authFetch("/api/wardrobe/generate-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: allWardrobeItems,
          weatherCondition: mode,
          temperatureText: tempText
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.result) {
        const outfit = data.result;
        const selectedItems = allWardrobeItems.filter(item =>
          outfit.selectedItemIds?.includes(item.id)
        );

        setCurrentOutfit({
          id: `outfit-${Date.now()}`,
          title: outfit.title || `Smart Look for ${mode.replace(/_/g, " ")}`,
          weatherCondition: mode,
          temperatureText: tempText,
          items: selectedItems.length > 0 ? selectedItems : allWardrobeItems.slice(0, 3),
          stylingAdvice: outfit.stylingAdvice || `Curated mix for ${tempText}.`,
          weatherMatchScore: outfit.weatherMatchScore || 95,
          savedAt: Date.now()
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("AI Outfit generation failed:", err);
      alert("Failed to generate AI outfit. Please try again later.");
    } finally {
      setIsGeneratingOutfit(false);
    }
  };

  return {
    showUploadModal, setShowUploadModal,
    uploadPreview, setUploadPreview,
    uploadTitle, setUploadTitle,
    uploadCategory, setUploadCategory,
    uploadWeather, setUploadWeather,
    uploadColor, setUploadColor,
    handleSaveUploadedItem,
    selectedWeatherMode, setSelectedWeatherMode,
    temperaturePrompt, setTemperaturePrompt,
    isGeneratingOutfit, setIsGeneratingOutfit,
    handleGenerateAIOutfit,
    mixMatchTop, setMixMatchTop, mixMatchBottom, setMixMatchBottom,
    mixMatchOuter, setMixMatchOuter, mixMatchShoes, setMixMatchShoes,
    slotDrawerCategory, setSlotDrawerCategory
  };
}
