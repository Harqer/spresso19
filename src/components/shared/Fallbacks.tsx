import React from "react";
import { MaterialIcon } from "../MaterialIcon";

interface EmptyStateFallbackProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyStateFallback: React.FC<EmptyStateFallbackProps> = ({
  icon = "inventory_2",
  title,
  description,
  actionLabel,
  onAction
}) => {
  return (
    <div className="bg-white p-12 rounded-3xl border border-[#d8ebd7] text-center text-[#5e635f] space-y-3 shadow-xs">
      <div className="w-12 h-12 bg-[#f2f8f2] text-[#386633] rounded-2xl flex items-center justify-center mx-auto">
        <MaterialIcon icon={icon} size={28} />
      </div>
      <h3 className="text-sm font-bold text-[#18211e]">{title}</h3>
      <p className="text-xs max-w-md mx-auto text-[#5e635f]">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="pt-3">
          <button
            onClick={onAction}
            className="px-4 py-2 bg-[#386633] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition hover:bg-[#2c5227]"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};

interface ErrorStateFallbackProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorStateFallback: React.FC<ErrorStateFallbackProps> = ({
  title = "Service Unavailable",
  message = "We're having trouble connecting to the backend service. Please try again.",
  onRetry
}) => {
  return (
    <div className="bg-red-50 p-6 rounded-3xl border border-red-200 text-center space-y-3 shadow-xs">
      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
        <MaterialIcon icon="error_outline" size={28} />
      </div>
      <h3 className="text-sm font-bold text-red-800">{title}</h3>
      <p className="text-xs text-red-600 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-xl text-xs font-bold shadow-sm cursor-pointer hover:bg-red-50 transition"
        >
          Retry
        </button>
      )}
    </div>
  );
};
