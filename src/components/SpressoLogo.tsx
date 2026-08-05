import React, { useState, useEffect } from "react";

const regeneratedLogo = "/src/assets/images/regenerated_image_1785478968408.png";

interface SpressoLogoProps {
  variant?: "full" | "icon" | "stacked";
  size?: "sm" | "md" | "lg" | "xl";
  theme?: "light" | "dark";
  imageUrl?: string;
  className?: string;
  imgClassName?: string;
  useVectorSvg?: boolean;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  showTextLeft?: boolean;
  text?: string;
}

// Helper to remove white & off-white background pixels from a loaded image using canvas
const getTransparentImageSrc = (src: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(src);

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Strip white & light off-white background pixels
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Near-white pixels threshold
          if (r > 225 && g > 225 && b > 225) {
            data[i + 3] = 0; // Set alpha to 0 (100% transparent)
          } else if (r > 200 && g > 200 && b > 200) {
            // Smooth anti-aliasing feathering for edges
            const avg = (r + g + b) / 3;
            const alphaFactor = Math.max(0, (225 - avg) / 25);
            data[i + 3] = Math.round(data[i + 3] * alphaFactor);
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
};

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
  const logoSrc = imageUrl || regeneratedLogo || "/SpressoLogo.png";
  const [transparentSrc, setTransparentSrc] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getTransparentImageSrc(logoSrc).then((processedSrc) => {
      if (isMounted) {
        setTransparentSrc(processedSrc);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [logoSrc]);

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
  const finalSrc = transparentSrc || logoSrc;

  const imageStyle: React.CSSProperties = {
    ...(width ? { width: typeof width === "number" ? `${width}px` : width } : {}),
    ...(height ? { height: typeof height === "number" ? `${height}px` : height } : {}),
    ...style,
  };

  const hasCustomHeight = height || (style && style.height);
  const heightClass = hasCustomHeight ? "" : currentHeight;
  const widthClass = width ? "" : "w-auto";

  // Compute text color classes based on theme prop and Tailwind dark mode
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
        src={finalSrc}
        alt="Spresso Logo"
        style={imageStyle}
        className={`${heightClass} ${widthClass} object-contain border-none dark:brightness-110 dark:contrast-110 transition-all ${imgClassName}`}
      />
    </div>
  );
};








