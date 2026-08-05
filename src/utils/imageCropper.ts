export const cropImageSnippet = (
  photoUrl: string,
  box?: number[],
  point?: { x: number; y: number }
): Promise<string> => {
  return new Promise((resolve) => {
    if (!photoUrl) return resolve("");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let cropX = 0;
      let cropY = 0;
      let cropWidth = img.width;
      let cropHeight = img.height;

      if (box && box.length === 4) {
        const ymin = Math.max(0, (box[0] / 1000) * img.height);
        const xmin = Math.max(0, (box[1] / 1000) * img.width);
        const ymax = Math.min(img.height, (box[2] / 1000) * img.height);
        const xmax = Math.min(img.width, (box[3] / 1000) * img.width);

        cropX = xmin;
        cropY = ymin;
        cropWidth = Math.max(20, xmax - xmin);
        cropHeight = Math.max(20, ymax - ymin);
      } else if (point) {
        const centerX = (point.x / 100) * img.width;
        const centerY = (point.y / 100) * img.height;
        const boxSize = Math.min(img.width, img.height) * 0.35;
        cropX = Math.max(0, centerX - boxSize / 2);
        cropY = Math.max(0, centerY - boxSize / 2);
        if (cropX + boxSize > img.width) cropX = Math.max(0, img.width - boxSize);
        if (cropY + boxSize > img.height) cropY = Math.max(0, img.height - boxSize);
        cropWidth = Math.min(img.width - cropX, boxSize);
        cropHeight = Math.min(img.height - cropY, boxSize);
      }

      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 200, 200);
        ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, 200, 200);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } else {
        resolve(photoUrl);
      }
    };
    img.onerror = () => resolve(photoUrl);
    img.src = photoUrl;
  });
};
