import React from 'react';
import { ProductItem } from '../../../types';
import { MaterialIcon } from '../../MaterialIcon';

interface ChatProductCardProps {
  product: ProductItem;
  layout?: 'horizontal' | 'vertical';
  onAddToCart?: (product: ProductItem) => void;
  onSelectTryOn?: (product: ProductItem) => void;
}

export const ChatProductCard: React.FC<ChatProductCardProps> = ({ 
  product, 
  layout = 'vertical',
  onAddToCart,
  onSelectTryOn
}) => {
  const isHorizontal = layout === 'horizontal';

  return (
    <div className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} gap-3 p-3 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)] rounded-2xl`}>
      <div className={`${isHorizontal ? 'w-24 h-24' : 'w-full h-40'} rounded-xl overflow-hidden flex-shrink-0 bg-[var(--md-sys-color-surface-container)]`}>
        <img src={product.image || ''} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--md-sys-color-primary)] uppercase">{product.brand}</span>
            <div className="flex items-center space-x-2">
              {product.rating ? (
                <div className="flex items-center space-x-0.5 text-amber-500 text-xs font-bold">
                  <MaterialIcon icon="star" size={13} filled className="text-amber-500" />
                  <span>{product.rating.toFixed(1)}</span>
                </div>
              ) : null}
              <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">${product.price.toFixed(2)}</span>
            </div>
          </div>
          <h4 className="text-sm font-semibold mt-1 text-[var(--md-sys-color-on-surface)] line-clamp-2">{product.name}</h4>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button 
            onClick={() => onSelectTryOn?.(product)}
            className="flex-1 flex justify-center items-center py-1.5 rounded-lg border border-[var(--md-sys-color-outline)] text-xs font-medium hover:bg-[var(--md-sys-color-surface-container)]"
          >
            <MaterialIcon icon="styler" size={14} className="mr-1" /> Try On
          </button>
          <button 
            onClick={() => onAddToCart?.(product)}
            className="flex-1 flex justify-center items-center py-1.5 rounded-lg bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-xs font-medium"
          >
            <MaterialIcon icon="add_shopping_cart" size={14} className="mr-1" /> Add
          </button>
        </div>
      </div>
    </div>
  );
};
