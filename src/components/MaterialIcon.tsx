import React from "react";

interface MaterialIconProps {
  icon: string;
  className?: string;
  filled?: boolean;
  size?: string | number;
  title?: string;
}

export const MaterialIcon: React.FC<MaterialIconProps> = ({
  icon,
  className = "",
  filled = false,
  size,
  title
}) => {
  if (icon === "deployed_code_account" || icon === "genai_agent") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="M664-121q-8-2-15-7l-120-70q-14-8-21.5-21.5T500-249v-141q0-16 7.5-29.5T529-441l120-70q7-5 15-7t16-2q8 0 15.5 2.5T710-511l120 70q14 8 22 21.5t8 29.5v141q0 16-8 29.5T830-198l-120 70q-7 4-14.5 6.5T680-119q-8 0-16-2ZM287-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM80-160v-112q0-33 17-62t47-44q51-26 115-44t141-18h14q6 0 12 2-8 18-13.5 37.5T404-360h-4q-71 0-127.5 18T180-306q-9 5-14.5 14t-5.5 20v32h252q6 21 16 41.5t22 38.5H80Zm376.5-423.5Q480-607 480-640t-23.5-56.5Q433-720 400-720t-56.5 23.5Q320-673 320-640t23.5 56.5Q367-560 400-560t56.5-23.5ZM400-640Zm12 400Zm174-166 94 55 94-55-94-54-94 54Zm124 208 90-52v-110l-90 53v109Zm-150-52 90 53v-109l-90-53v109Z"/>
      </svg>
    );
  }

  if (icon === "google_lens" || icon === "lens" || icon === "lens_blur") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="M106-386q-6-6-6-14t6-14q6-6 14-6t14 6q6 6 6 14t-6 14q-6 6-14 6t-14-6Zm0-160q-6-6-6-14t6-14q6-6 14-6t14 6q6 6 6 14t-6 14q-6 6-14 6t-14-6Zm105.5 334.5Q200-223 200-240t11.5-28.5Q223-280 240-280t28.5 11.5Q280-257 280-240t-11.5 28.5Q257-200 240-200t-28.5-11.5Zm0-160Q200-383 200-400t11.5-28.5Q223-440 240-440t28.5 11.5Q280-417 280-400t-11.5 28.5Q257-360 240-360t-28.5-11.5Zm0-160Q200-543 200-560t11.5-28.5Q223-600 240-600t28.5 11.5Q280-577 280-560t-11.5 28.5Q257-520 240-520t-28.5-11.5Zm0-160Q200-703 200-720t11.5-28.5Q223-760 240-760t28.5 11.5Q280-737 280-720t-11.5 28.5Q257-680 240-680t-28.5-11.5Zm146 334Q340-375 340-400t17.5-42.5Q375-460 400-460t42.5 17.5Q460-425 460-400t-17.5 42.5Q425-340 400-340t-42.5-17.5Zm0-160Q340-535 340-560t17.5-42.5Q375-620 400-620t42.5 17.5Q460-585 460-560t-17.5 42.5Q425-500 400-500t-42.5-17.5Zm14 306Q360-223 360-240t11.5-28.5Q383-280 400-280t28.5 11.5Q440-257 440-240t-11.5 28.5Q417-200 400-200t-28.5-11.5Zm0-480Q360-703 360-720t11.5-28.5Q383-760 400-760t28.5 11.5Q440-737 440-720t-11.5 28.5Q417-680 400-680t-28.5-11.5ZM386-106q-6-6-6-14t6-14q6-6 14-6t14 6q6 6 6 14t-6 14q-6 6-14 6t-14-6Zm0-720q-6-6-6-14t6-14q6-6 14-6t14 6q6 6 6 14t-6 14q-6 6-14 6t-14-6Zm131.5 468.5Q500-375 500-400t17.5-42.5Q535-460 560-460t42.5 17.5Q620-425 620-400t-17.5 42.5Q585-340 560-340t-42.5-17.5Zm0-160Q500-535 500-560t17.5-42.5Q535-620 560-620t42.5 17.5Q620-585 620-560t-17.5 42.5Q585-500 560-500t-42.5-17.5Zm14 306Q520-223 520-240t11.5-28.5Q543-280 560-280t28.5 11.5Q600-257 600-240t-11.5 28.5Q577-200 560-200t-28.5-11.5Zm0-480Q520-703 520-720t11.5-28.5Q543-760 560-760t28.5 11.5Q600-737 600-720t-11.5 28.5Q577-680 560-680t-28.5-11.5ZM546-106q-6-6-6-14t6-14q6-6 14-6t14 6q6 6 6 14t-6 14q-6 6-14 6t-14-6Zm0-720q-6-6-6-14t6-14q6-6 14-6t14 6q6 6 6 14t-6 14q-6 6-14 6t-14-6Zm145.5 614.5Q680-223 680-240t11.5-28.5Q703-280 720-280t28.5 11.5Q760-257 760-240t-11.5 28.5Q737-200 720-200t-28.5-11.5Zm0-160Q680-383 680-400t11.5-28.5Q703-440 720-440t28.5 11.5Q760-417 760-400t-11.5 28.5Q737-360 720-360t-28.5-11.5Zm0-160Q680-543 680-560t11.5-28.5Q703-600 720-600t28.5 11.5Q760-577 760-560t-11.5 28.5Q737-520 720-520t-28.5-11.5Zm0-160Q680-703 680-720t11.5-28.5Q703-760 720-760t28.5 11.5Q760-737 760-720t-11.5 28.5Q737-680 720-680t-28.5-11.5ZM826-386q-6-6-6-14t6-14q6-6 14-6t14 6q6 6 6 14t-6 14q-6 6-14 6t-14-6Zm0-160q-6-6-6-14t6-14q6-6 14-6t14 6q6 6 6 14t-6 14q-6 6-14 6t-14-6Z" />
      </svg>
    );
  }

  if (icon === "menu_open") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="M120-240v-80h520v80H120Zm664-40L584-480l200-200 56 56-144 144 144 144-56 56ZM120-440v-80h400v80H120Zm0-200v-80h520v80H120Z"/>
      </svg>
    );
  }
  if (icon === "location_on" || icon === "share_location" || icon === "my_location" || icon === "add_location_alt" || icon === "near_me") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="M480-80Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880h20q10 0 20 2v81q-10-2-19.5-2.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186q122-112 181-203.5T720-552v-8h80v8q0 100-79.5 217.5T480-80Zm56.5-423.5Q560-527 560-560t-23.5-56.5Q513-640 480-640t-56.5 23.5Q400-593 400-560t23.5 56.5Q447-480 480-480t56.5-23.5ZM480-560Zm240-80h80v-120h120v-80H800v-120h-80v120H600v80h120v120Z" />
      </svg>
    );
  }

  if (icon === "wardrobe" || icon === "checkroom") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="M280-80v-240h-64q-40 0-68-28t-28-68q0-29 16-53.5t42-36.5l262-116v-26q-36-13-58-43.5T360-760q0-50 35-85t85-35q50 0 85 35t35 85h-80q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760q0 17 11.5 28.5T480-720t28.5 11.5Q520-697 520-680v58l262 116q26 12 42 36.5t16 53.5q0 40-28 68t-68 28h-64v240H280Zm-64-320h64v-40h400v40h64q7 0 11.5-5t4.5-13q0-5-2.5-8.5T750-432L480-552 210-432q-5 2-7.5 5.5T200-418q0 8 4.5 13t11.5 5Zm144 240h240v-200H360v200Zm0-200h240-240Z" />
      </svg>
    );
  }

  if (icon === "360" || icon === "threesixty" || icon === "3d_rotation") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="m360-160-56-56 70-72q-128-17-211-70T80-480q0-83 115.5-141.5T480-680q169 0 284.5 58.5T880-480q0 62-66.5 111T640-296v-82q77-20 118.5-49.5T800-480q0-32-85.5-76T480-600q-149 0-234.5 44T160-480q0 24 51 57.5T356-372l-52-52 56-56 160 160-160 160Z"/>
      </svg>
    );
  }

  if (icon === "swipe") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="M473-80q-24 0-46-9t-39-26L184-320l30-31q16-16 37.5-21.5t42.5.5l66 19v-327q0-17 11.5-28.5T400-720q17 0 28.5 11.5T440-680v433l-97-27 102 102q5 5 12.5 8.5T473-160h167q33 0 56.5-23.5T720-240v-160q0-17 11.5-28.5T760-440q17 0 28.5 11.5T800-400v160q0 66-47 113T640-80H473Zm7-280v-160q0-17 11.5-28.5T520-560q17 0 28.5 11.5T560-520v160h-80Zm120 0v-120q0-17 11.5-28.5T640-520q17 0 28.5 11.5T680-480v120h-80Zm-20 80Zm300-400H680v-60h116q-66-58-147-89t-169-31q-88 0-169 31t-147 89h116v60H80v-200h60v81q72-59 159-90t181-31q94 0 181 31t159 90v-81h60v200Z"/>
      </svg>
    );
  }

  if (icon === "animation" || icon === "animation_view" || icon === "styler" || icon === "try_on" || icon === "virtual_try_on") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="M360-80q-58 0-109-22t-89-60q-38-38-60-89T80-360q0-81 42-148t110-102q20-39 49.5-68.5T350-728q33-68 101-110t149-42q58 0 109 22t89 60q38 38 60 89t22 109q0 85-42 150T728-350q-20 39-49.5 68.5T610-232q-35 68-102 110T360-80Zm0-80q33 0 63.5-10t56.5-30q-58 0-109-22t-89-60q-38-38-60-89t-22-109q-20 26-30 56.5T160-360q0 42 16 78t43 63q27 27 63 43t78 16Zm120-120q33 0 64.5-10t57.5-30q-59 0-110-22.5T403-403q-38-38-60-89T320-602q-20 26-30 57.5T280-480q0 42 15.5 78t43.5 63q27 28 63 43.5t78 15.5Zm120-120q18 0 34.5-3t33.5-9q22-60 6.5-115.5T621-621q-38-38-93.5-53.5T412-668q-6 17-9 33.5t-3 34.5q0 42 15.5 78t43.5 63q27 28 63 43.5t78 15.5Zm160-78q20-26 30-57.5t10-64.5q0-42-15.5-78T741-741q-27-28-63-43.5T600-800q-35 0-65.5 10T478-760q59 0 110 22.5t89 60.5q38 38 60.5 89T760-478ZM600-600Z"/>
      </svg>
    );
  }

  if (icon === "recommend" || icon === "for_you") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="M649-496.5Q737-513 800-540v400q-60 27-146 43.5T480-80q-88 0-174-16.5T160-140v-400q63 27 151 43.5T480-480q81 0 169-16.5ZM720-200v-230q-50 14-115.5 22T480-400q-59 0-124.5-8T240-430v230q50 18 115 29t125 11q60 0 125-11t115-29ZM593-833q47 47 47 113t-47 113q-47 47-113 47t-113-47q-47-47-47-113t47-113q47-47 113-47t113 47Zm-56.5 169.5Q560-687 560-720t-23.5-56.5Q513-800 480-800t-56.5 23.5Q400-753 400-720t23.5 56.5Q447-640 480-640t56.5-23.5ZM480-720Zm0 425Z" />
      </svg>
    );
  }

  if (icon === "swipe_left") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="M473-80q-24 0-46-9t-39-26L184-320l30-31q16-16 37.5-21.5t42.5.5l66 19v-327q0-17 11.5-28.5T400-720q17 0 28.5 11.5T440-680v433l-97-27 102 102q5 5 12.5 8.5T473-160h167q33 0 56.5-23.5T720-240v-160q0-17 11.5-28.5T760-440q17 0 28.5 11.5T800-400v160q0 66-47 113T640-80H473Zm7-280v-160q0-17 11.5-28.5T520-560q17 0 28.5 11.5T560-520v160h-80Zm120 0v-120q0-17 11.5-28.5T640-520q17 0 28.5 11.5T680-480v120h-80ZM80-680v-200h60v81q72-59 159-90t181-31q146 0 258 67t142 173h-63q-38-84-128.5-132T480-860q-88 0-169 31t-147 89h116v60H80Zm500 400Z" />
      </svg>
    );
  }

  if (icon === "swipe_right") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="M473-80q-24 0-46-9t-39-26L184-320l30-31q16-16 37.5-21.5t42.5.5l66 19v-327q0-17 11.5-28.5T400-720q17 0 28.5 11.5T440-680v433l-97-27 102 102q5 5 12.5 8.5T473-160h167q33 0 56.5-23.5T720-240v-160q0-17 11.5-28.5T760-440q17 0 28.5 11.5T800-400v160q0 66-47 113T640-80H473Zm7-280v-400q0-17 11.5-28.5T520-800q17 0 28.5 11.5T560-760v400h-80Zm120 0v-120q0-17 11.5-28.5T640-520q17 0 28.5 11.5T680-480v120h-80ZM80-680v-200h60v81q72-59 159-90t181-31q146 0 258 67t142 173h-63q-38-84-128.5-132T480-860q-88 0-169 31t-147 89h116v60H80Zm500 400Z" />
      </svg>
    );
  }

  if (icon === "cameraswitch") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h600q33 0 56.5 23.5T840-720v480q0 33-23.5 56.5T760-160H160Zm320-160q66 0 113-47t47-113q0-66-47-113t-113-47q-66 0-113 47t-47 113q0 66 47 113t113 47Zm0-80q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Z"/>
      </svg>
    );
  }

  if (icon === "photo_library" || icon === "photo") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h600q33 0 56.5 23.5T840-720v480q0 33-23.5 56.5T760-160H160Zm0-80h600v-480H160v480Zm80-80h440L530-520 400-350l-90-120-110 150Zm-80 80v-480 480Z"/>
      </svg>
    );
  }

  if (icon === "receipt_long" || icon === "receipt") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="M240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h480q33 0 56.5 23.5T800-800v640q0 33-23.5 56.5T720-80H240Zm0-80h480v-640H240v640Zm80-120h320v-80H320v80Zm0-160h320v-80H320v80Zm0-160h320v-80H320v80Z"/>
      </svg>
    );
  }

  if (icon === "graphic_eq" || icon === "equalizer") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="M200-200v-560h80v560h-80Zm160 80v-720h80v720h-80Zm160-240v-240h80v240h-80Zm160 80v-400h80v400h-80Z"/>
      </svg>
    );
  }

  if (icon === "auto_awesome") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="m380-380 100-220 100 220 220 100-220 100-100 220-100-220-220-100 220-100Zm-200-360 50-110 50 110 110 50-110 50-50 110-50-110-110-50 110-50Zm440 0 50-110 50 110 110 50-110 50-50 110-50-110-110-50 110-50Z"/>
      </svg>
    );
  }

  if (icon === "shopping_cart" || icon === "shopping_bag") {
    const pixelSize = typeof size === "number" ? size : (size ? parseInt(String(size)) || 20 : 20);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height={`${pixelSize}px`}
        width={`${pixelSize}px`}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`inline-block align-middle select-none ${className}`}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {title && <title>{title}</title>}
        <path d="m480-560-56-56 63-64H320v-80h167l-64-64 57-56 160 160-160 160ZM223.5-103.5Q200-127 200-160t23.5-56.5Q247-240 280-240t56.5 23.5Q360-193 360-160t-23.5 56.5Q313-80 280-80t-56.5-23.5Zm400 0Q600-127 600-160t23.5-56.5Q647-240 680-240t56.5 23.5Q760-193 760-160t-23.5 56.5Q713-80 680-80t-56.5-23.5ZM40-800v-80h131l170 360h280l156-280h91L692-482q-11 20-29.5 31T622-440H324l-44 80h480v80H280q-45 0-68.5-39t-1.5-79l54-98-144-304H40Z" />
      </svg>
    );
  }

  const style: React.CSSProperties = {
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`
  };

  if (size) {
    style.fontSize = typeof size === "number" ? `${size}px` : size;
  }

  return (
    <span
      className={`material-symbols-outlined select-none align-middle inline-block ${className}`}
      style={style}
      title={title}
    >
      {icon}
    </span>
  );
};
