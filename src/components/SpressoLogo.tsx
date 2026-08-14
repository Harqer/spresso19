import React from "react";

/**
 * Canonical Spresso Logo Component.
 * Primary Brand Asset: /spresso_logo.svg (Terracotta shopping bag + organic green leaf + 'spresso' wordmark)
 * Icon Mark: /spresso_icon.svg
 * PNG Fallback: /SpressoLogo.png
 */
interface SpressoLogoProps {
  variant?: "full" | "icon" | "stacked";
  size?: "sm" | "md" | "lg" | "xl";
  theme?: "light" | "dark";
  imageUrl?: string;
  className?: string;
  imgClassName?: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  showTextLeft?: boolean;
  text?: string;
}

export const SpressoLogo: React.FC<SpressoLogoProps> = ({
  size = "md",
  variant = "full",
  theme,
  imageUrl,
  className = "",
  imgClassName = "",
  width,
  height,
  style,
  showTextLeft = false,
  text = "spresso",
}) => {
  // Dynamically select Light vs Dark transparent PNG logo assets based on active theme
  const isDarkTheme = theme === "dark" || (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  const defaultPng = variant === "icon"
    ? (isDarkTheme ? "/logo_icon_transparent.png" : "/logo_light_icon.png")
    : (isDarkTheme ? "/logo_dark_transparent.png" : "/logo_light_transparent.png");
  const logoSrc = imageUrl || defaultPng;
  const heightClasses = {
    sm: "h-7",
    md: "h-9",
    lg: "h-12",
    xl: "h-16",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const currentHeight = heightClasses[size] || heightClasses.md;
  const currentTextSize = textSizeClasses[size] || textSizeClasses.md;

  const imageStyle: React.CSSProperties = {
    ...(width ? { width: typeof width === "number" ? `${width}px` : width } : {}),
    ...(height ? { height: typeof height === "number" ? `${height}px` : height } : {}),
    ...style,
  };

  const hasCustomHeight = height || (style && style.height);
  const heightClass = hasCustomHeight ? "" : currentHeight;
  const widthClass = width ? "" : "w-auto";

  const textColorClass = theme === "dark"
    ? "text-white"
    : theme === "light"
    ? "text-[#191d16]"
    : "text-[#191d16] dark:text-[#f8fafc]";

  return (
    <div className={`inline-flex items-center space-x-2 select-none ${className}`}>
      {showTextLeft && (
        <span className={`font-extrabold ${currentTextSize} tracking-tight ${textColorClass} font-sans lowercase drop-shadow-2xs transition-colors duration-200`}>
          {text}
        </span>
      )}
      <img
        src={logoSrc}
        alt="Spresso Logo"
        style={imageStyle}
        className={`${heightClass} ${widthClass} object-contain border-none transition-all ${imgClassName}`}
      />
    </div>
  );
};
