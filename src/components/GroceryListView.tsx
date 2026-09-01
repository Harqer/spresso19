import Logger from "../lib/Logger";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MaterialIcon } from "./MaterialIcon";
import { ProductItem } from "../types";
import { auth } from "../lib/firebase";
import { getGroceryList, addGroceryItem, toggleGroceryItem, deleteGroceryItem, createGroceryList } from "../dataconnect";

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

export function GroceryListView({ onAddToCart, products = [], onAskAI }: GroceryListViewProps) {
  const [items, setItems] = useState<GroceryItem[]>(() => {
    return (products || []).map((p) => ({
      id: p.id,
      name: p.name,
      quantity: 1,
      unit: "item",
      category: p.category ? p.category.replace(/^Grocery\s*-\s*/, '') : "Produce",
      estimatedPrice: p.price,
      checked: false,
      storeNote: p.brand ? `${p.brand} • $${(p.price || 0).toFixed(2)}` : undefined
    }));
  });

  const [listId, setListId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Produce");
  const [filterCategory, setFilterCategory] = useState("All");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroceryList = async () => {
      if (!auth.currentUser) return;
      try {
        const res = await getGroceryList({ userId: auth.currentUser.uid });
        if (res.data.groceryLists.length > 0) {
          const list = res.data.groceryLists[0];
          setListId(list.id);
          const mappedItems: GroceryItem[] = list.items.map((i: any) => ({
            id: i.id,
            name: i.productName,
            quantity: 1, // Quantity not strictly in schema, defaulting
            unit: "item",
            category: "Produce", // Category not in schema, defaulting
            estimatedPrice: 0,
            checked: i.isPurchased,
          }));
          setItems(mappedItems);
        } else {
          // Create a default list
          const createRes = await createGroceryList({ userId: auth.currentUser.uid, title: "My Groceries" });
          setListId(createRes.data.groceryList_insert.id);
        }
      } catch (err) {
        Logger.error("Failed to fetch grocery list:", err);
      }
    };
    fetchGroceryList();
  }, [auth.currentUser]);

  useEffect(() => {
    if (products && products.length > 0) {
      setItems(prev => {
        const newItems = products
          .filter(p => !prev.some(item => item.id === p.id))
          .map(p => ({
            id: p.id,
            name: p.name,
            quantity: 1,
            unit: "item",
            category: p.category ? p.category.replace(/^Grocery\s*-\s*/, '') : "Produce",
            estimatedPrice: p.price,
            checked: false,
            storeNote: p.brand ? `${p.brand} • $${(p.price || 0).toFixed(2)}` : undefined
          }));
        if (newItems.length > 0) {
          return [...newItems, ...prev];
        }
        return prev;
      });
    }
  }, [products]);

  const toggleCheck = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    // Optimistic UI update
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
    
    try {
      if (!id.startsWith("custom-")) {
        await toggleGroceryItem({ id, isPurchased: !item.checked });
      }
    } catch (err) {
      Logger.error("Failed to toggle item", err);
      // Revert on failure
      setItems(prev => prev.map(i => i.id === id ? { ...i, checked: item.checked } : i));
      setError("Failed to update item status.");
    }
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

  const removeItem = async (id: string) => {
    // Optimistic remove
    const removedItem = items.find(i => i.id === id);
    setItems(prev => prev.filter(item => item.id !== id));
    
    try {
      if (!id.startsWith("custom-") && removedItem) {
        await deleteGroceryItem({ id });
      }
    } catch (err) {
      Logger.error("Failed to delete item", err);
      if (removedItem) {
        setItems(prev => [...prev, removedItem]);
      }
      setError("Failed to delete item.");
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !listId) return;

    const tempId = `custom-${Date.now()}`;
    const newItem: GroceryItem = {
      id: tempId,
      name: newItemName.trim(),
      quantity: 1,
      unit: "item",
      category: newItemCategory,
      estimatedPrice: 0,
      checked: false
    };

    setItems(prev => [newItem, ...prev]);
    setNewItemName("");

    try {
      const res = await addGroceryItem({
        listId,
        productName: newItem.name,
        addedVia: "manual"
      });
      // Update ID to the real database UUID
      setItems(prev => prev.map(i => i.id === tempId ? { ...i, id: res.data.groceryListItem_insert.id } : i));
    } catch (err) {
      Logger.error("Failed to add item", err);
      setItems(prev => prev.filter(i => i.id !== tempId));
      setError("Failed to add item to database.");
    }
  };

  const handleSendToCart = (item: GroceryItem) => {
    if (onAddToCart) {
      onAddToCart({
        id: item.id,
        name: item.name,
        brand: item.storeNote || "",
        price: item.estimatedPrice * item.quantity,
        currency: "USD",
        category: `Grocery - ${item.category}`,
        description: `Grocery List Item: ${item.quantity} ${item.unit}(s) of ${item.name}`,
        image: "",
        availabilityStatus: "VERIFY_AT_MERCHANT_CHECKOUT",
        sku: `GROC-${item.id.toUpperCase()}`,
        rating: 0,
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
              ${(totalEstimated || 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-[#a84a32] text-xs px-6 py-2 border-b border-red-100 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="cursor-pointer font-bold">✕</button>
        </div>
      )}

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
          <AnimatePresence mode="popLayout">
            {filteredItems.map(item => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
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
                  ${((item.estimatedPrice || 0) * item.quantity).toFixed(2)}
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
            </motion.div>
          ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
