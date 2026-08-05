import React, { useState, useEffect } from "react";
import { MaterialIcon } from "./MaterialIcon";
import { ProductItem } from "../types";

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimatedPrice: number;
  checked: boolean;
  storeNote?: string;
}

interface GroceryListViewProps {
  onAddToCart?: (product: ProductItem) => void;
  products?: ProductItem[];
  onAskAI?: (text: string, image?: string | null) => void;
  searchRadius?: number;
  onRadiusChange?: (radius: number) => void;
}

const DEFAULT_GROCERY_ITEMS: GroceryItem[] = [
  {
    id: "g-1",
    name: "Organic Garlic Cloves",
    quantity: 2,
    unit: "cloves",
    category: "Produce",
    estimatedPrice: 0.89,
    checked: false,
    storeNote: "Kunisaki Farms • $0.89 ea"
  },
  {
    id: "g-2",
    name: "Fresh Raspberries",
    quantity: 1,
    unit: "pint",
    category: "Produce",
    estimatedPrice: 3.99,
    checked: false,
    storeNote: "Bernal Growers • $3.99/pint"
  },
  {
    id: "g-3",
    name: "Organic Whole Milk",
    quantity: 1,
    unit: "gallon",
    category: "Dairy",
    estimatedPrice: 4.99,
    checked: true,
    storeNote: "Organic Valley • $4.99/gal"
  },
  {
    id: "g-4",
    name: "Hass Avocados",
    quantity: 3,
    unit: "items",
    category: "Produce",
    estimatedPrice: 3.49,
    checked: false,
    storeNote: "Sun Valley • $3.49 3-pack"
  },
  {
    id: "g-5",
    name: "Artisanal Sourdough Bread",
    quantity: 1,
    unit: "loaf",
    category: "Bakery",
    estimatedPrice: 5.99,
    checked: false,
    storeNote: "Hearthside Bakers • $5.99"
  }
];

export function GroceryListView({ onAddToCart, onAskAI }: GroceryListViewProps) {
  const [items, setItems] = useState<GroceryItem[]>(() => {
    try {
      const saved = localStorage.getItem("spresso_vertical_grocery_list");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_GROCERY_ITEMS;
  });

  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Produce");
  const [filterCategory, setFilterCategory] = useState("All");

  useEffect(() => {
    try {
      localStorage.setItem("spresso_vertical_grocery_list", JSON.stringify(items));
    } catch (e) {}
  }, [items]);

  const toggleCheck = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: GroceryItem = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      quantity: 1,
      unit: "item",
      category: newItemCategory,
      estimatedPrice: 2.50,
      checked: false,
      storeNote: "Aggregated Local Market Item"
    };

    setItems(prev => [newItem, ...prev]);
    setNewItemName("");
  };

  const handleSendToCart = (item: GroceryItem) => {
    if (onAddToCart) {
      onAddToCart({
        id: item.id,
        name: item.name,
        brand: "Local Organic Market",
        price: item.estimatedPrice * item.quantity,
        currency: "USD",
        category: `Grocery - ${item.category}`,
        description: `Grocery List Item: ${item.quantity} ${item.unit}(s) of ${item.name}`,
        image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop",
        stock: 50,
        sku: `GROC-${item.id.toUpperCase()}`,
        rating: 4.8,
        virtualTryOnEligible: false,
        mcpServerId: "spresso-mcp-grocery"
      });
    }
  };

  const categories = ["All", "Produce", "Dairy", "Bakery", "Pantry", "Beverages"];

  const filteredItems = items.filter(
    item => filterCategory === "All" || item.category === filterCategory
  );

  const totalEstimated = items
    .filter(i => !i.checked)
    .reduce((sum, item) => sum + item.estimatedPrice * item.quantity, 0);

  return (
    <div className="w-full max-w-3xl mx-auto md3-card-level-2 rounded-3xl overflow-hidden font-sans">
      {/* Header */}
      <div className="p-6 bg-[#f2f8f2] border-b border-[#d8ebd7] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-serif font-bold text-[#386633] flex items-center space-x-2">
            <MaterialIcon icon="shopping_bag" size={24} />
            <span>Grocery List</span>
          </h1>
          <p className="text-xs text-[#5e635f] mt-0.5">
            Minimalist vertical shopping list & price estimator
          </p>
        </div>

        {items.length > 0 && (
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono font-bold text-[#5e635f] block">
              Estimated Total
            </span>
            <span className="text-base font-bold text-[#386633] font-mono">
              ${totalEstimated.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Quick Add Input Bar */}
      <form onSubmit={handleAddItem} className="p-4 border-b border-[#d8ebd7] bg-white flex items-center gap-2">
        <input
          type="text"
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          placeholder="Add an item (e.g. Avocado, Almond Milk...)"
          className="flex-1 px-4 py-2.5 bg-[#f8faf8] border border-[#d8ebd7] rounded-xl text-xs text-[#18211e] focus:outline-none focus:border-[#386633]"
        />
        <select
          value={newItemCategory}
          onChange={e => setNewItemCategory(e.target.value)}
          className="px-3 py-2.5 bg-[#f8faf8] border border-[#d8ebd7] rounded-xl text-xs text-[#18211e] focus:outline-none"
        >
          {categories.filter(c => c !== "All").map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2.5 bg-[#386633] text-white text-xs font-bold rounded-xl hover:bg-[#2c5227] transition cursor-pointer flex items-center space-x-1 shrink-0"
        >
          <MaterialIcon icon="add" size={16} />
          <span>Add</span>
        </button>
      </form>

      {/* Category Filter Pills */}
      <div className="px-6 py-3 border-b border-[#d8ebd7] bg-[#fdfdfd] flex items-center space-x-2 overflow-x-auto no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              filterCategory === cat
                ? "bg-[#386633] text-white"
                : "bg-white text-[#5e635f] border border-[#d8ebd7] hover:bg-[#f2f8f2]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Vertical Grocery List */}
      <div className="p-6 space-y-2.5 min-h-[300px]">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-[#5e635f] space-y-2">
            <MaterialIcon icon="checklist_rtl" size={36} className="mx-auto text-[#a8baa7]" />
            <p className="text-xs">No items found in this category.</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3.5 rounded-2xl transition ${
                item.checked
                  ? "opacity-50 md3-card-level-0"
                  : "md3-card-level-1 hover:border-[var(--md-sys-color-primary)]"
              }`}
            >
              {/* Checkbox & Details */}
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <button
                  onClick={() => toggleCheck(item.id)}
                  className="cursor-pointer text-[#386633] shrink-0"
                >
                  <MaterialIcon
                    icon={item.checked ? "check_circle" : "radio_button_unchecked"}
                    size={22}
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-sm font-semibold truncate ${
                        item.checked ? "line-through text-[#5e635f]" : "text-[#18211e]"
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#eaf3ea] text-[#386633] font-mono shrink-0 font-bold">
                      {item.category}
                    </span>
                  </div>
                  {item.storeNote && (
                    <p className="text-[11px] text-[#5e635f] truncate mt-0.5">{item.storeNote}</p>
                  )}
                </div>
              </div>

              {/* Controls & Price */}
              <div className="flex items-center space-x-3 shrink-0 ml-2">
                <div className="flex items-center space-x-1.5 bg-[#f2f8f2] border border-[#d8ebd7] rounded-xl px-2 py-1">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-0.5 hover:bg-[#d8ebd7] rounded-lg transition cursor-pointer text-[#18211e]"
                  >
                    <MaterialIcon icon="remove" size={14} />
                  </button>
                  <span className="text-xs font-mono font-bold text-[#18211e] w-5 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-0.5 hover:bg-[#d8ebd7] rounded-lg transition cursor-pointer text-[#18211e]"
                  >
                    <MaterialIcon icon="add" size={14} />
                  </button>
                </div>

                <span className="text-xs font-mono font-bold text-[#386633] w-14 text-right">
                  ${(item.estimatedPrice * item.quantity).toFixed(2)}
                </span>

                {onAddToCart && (
                  <button
                    onClick={() => handleSendToCart(item)}
                    className="p-1.5 text-[#386633] hover:bg-[#eaf3ea] rounded-xl transition cursor-pointer"
                    title="Add item to shopping cart"
                  >
                    <MaterialIcon icon="add_shopping_cart" size={18} />
                  </button>
                )}

                {onAskAI && (
                  <button
                    onClick={() => onAskAI(`Where can I find deals for ${item.name} near me?`)}
                    className="p-1.5 text-[#5e635f] hover:text-[#386633] hover:bg-[#eaf3ea] rounded-xl transition cursor-pointer"
                    title="Ask AI for deals on this item"
                  >
                    <MaterialIcon icon="auto_awesome" size={18} />
                  </button>
                )}

                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 text-[#5e635f] hover:text-[#a84a32] hover:bg-red-50 rounded-xl transition cursor-pointer"
                  title="Remove item"
                >
                  <MaterialIcon icon="delete_outline" size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
