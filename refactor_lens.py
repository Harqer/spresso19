import re

with open("src/components/GoogleLensScreenWidgetModal.tsx", "r") as f:
    content = f.read()

# 1. Remove GoogleLensBoundingBox import
content = content.replace(
    'import { GoogleLensBoundingBox } from "./features/vision/GoogleLensBoundingBox";\n',
    ''
)

# 2. Replace manual draw states with domObjects
content = re.sub(
    r'// Coordinate and gesture tracking states for draw selection\s+const \[isDrawing, setIsDrawing\].*?const \[cropBox, setCropBox\].*?null\);',
    '// DOM Object detection state\n  const [domObjects, setDomObjects] = useState<Array<{id: string; box: { ymin: number, xmin: number, ymax: number, xmax: number }}>>([]);',
    content,
    flags=re.DOTALL
)

# 3. Reset domObjects
content = content.replace(
    'setCropBox(null);',
    'setDomObjects([]);'
)

# 4. Inject DOM scan in captureCurrentAppScreen and remove auto runGoogleLensScreenAnalysis
capture_original = """  const captureCurrentAppScreen = async () => {
    setIsCapturingScreen(true);
    try {
      const modalEl = document.getElementById("google-lens-modal-container");
      if (modalEl) modalEl.style.visibility = "hidden";

      const canvasPromise = html2canvas(document.body, {"""

capture_replacement = """  const captureCurrentAppScreen = async () => {
    setIsCapturingScreen(true);
    try {
      const modalEl = document.getElementById("google-lens-modal-container");
      if (modalEl) modalEl.style.visibility = "hidden";

      // Scan DOM for visually prominent elements to auto-highlight
      const elements = Array.from(document.querySelectorAll('img, [data-product-id], [data-lens-id]'));
      const objects: any[] = [];
      elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 60 && rect.height > 60 && rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth) {
          const ymin = Math.round((rect.top / window.innerHeight) * 1000);
          const xmin = Math.round((rect.left / window.innerWidth) * 1000);
          const ymax = Math.round((rect.bottom / window.innerHeight) * 1000);
          const xmax = Math.round((rect.right / window.innerWidth) * 1000);
          objects.push({
            id: `dom-obj-${index}`,
            box: { ymin: Math.max(0, ymin), xmin: Math.max(0, xmin), ymax: Math.min(1000, ymax), xmax: Math.min(1000, xmax) }
          });
        }
      });
      setDomObjects(objects);

      const canvasPromise = html2canvas(document.body, {"""

content = content.replace(capture_original, capture_replacement)

# Remove the automatic execution
run_analysis_original = """        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setScreenSnapshot(dataUrl);
        runGoogleLensScreenAnalysis(dataUrl);
      } else {"""
run_analysis_replacement = """        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setScreenSnapshot(dataUrl);
        // We defer runGoogleLensScreenAnalysis until the user taps a highlighted dot, unless it's empty
        if (objects.length === 0) {
            runGoogleLensScreenAnalysis(dataUrl);
        }
      } else {"""
content = content.replace(run_analysis_original, run_analysis_replacement)

# 5. Remove Gesture Handling Functions
content = re.sub(
    r'  // Gesture handling functions \(Click / Drag crop selection\).*?  if \(!isOpen\) return null;',
    '  if (!isOpen) return null;',
    content,
    flags=re.DOTALL
)

# 6. Update JSX for image container
jsx_original = """                {/* Interactive Screen Capture Selection Container */}
                <div className="md:col-span-6 flex items-center justify-center relative my-4 sm:my-0">
                  <div
                    ref={imageContainerRef}
                    className="relative w-full max-w-[340px] h-[340px] rounded-3xl overflow-hidden border border-white/20 bg-stone-900 shadow-2xl cursor-crosshair select-none flex items-center justify-center"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {screenSnapshot ? (
                      <img
                        src={screenSnapshot}
                        alt="Captured App Screen"
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 space-y-2">
                        <MaterialIcon icon="image" size={36} />
                        <span className="text-xs">Capturing screen layout...</span>
                      </div>
                    )}

                    {/* Pulsing scanning overlay if processing */}
                    {isScanning && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none z-30">
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse absolute top-1/2 left-0 right-0 transform -translate-y-1/2" />
                        <MaterialIcon icon="auto_awesome" size={32} className="text-orange-400 animate-spin" />
                      </div>
                    )}

                    {/* Current Selection Box Overlay */}
                    {isDrawing && (
                      <div
                        className="absolute border-2 border-dashed border-orange-500 bg-orange-500/10 pointer-events-none z-25"
                        style={getBoxStyle()}
                      />
                    )}

                    <GoogleLensBoundingBox
                      cropBox={cropBox}
                      startPoint={startPoint}
                      currentPoint={currentPoint}
                      containerRect={imageContainerRef.current?.getBoundingClientRect()}
                      onChange={(newBox) => setCropBox(newBox)}
                      onResizeEnd={async (newBox) => {
                        setIsScanning(true);
                        try {
                          const cropped = await cropImageSnippet(screenSnapshot!, [newBox.ymin, newBox.xmin, newBox.ymax, newBox.xmax]);
                          await runGoogleLensScreenAnalysis(cropped);
                        } catch (err) {
                          setIsScanning(false);
                        }
                      }}
                    />
                  </div>
                </div>"""

jsx_replacement = """                {/* Interactive Screen Capture Auto-Detection Overlay */}
                <div className="md:col-span-6 flex items-center justify-center relative my-4 sm:my-0">
                  <div
                    ref={imageContainerRef}
                    className="relative w-full max-w-[340px] flex items-center justify-center border border-white/20 bg-stone-900 rounded-3xl overflow-hidden shadow-2xl"
                  >
                    {screenSnapshot ? (
                      <div className="relative w-full" style={{ aspectRatio: `${window.innerWidth}/${window.innerHeight}` }}>
                        <img
                          src={screenSnapshot}
                          alt="Captured App Screen"
                          className="w-full h-full object-cover pointer-events-none"
                        />
                        
                        {/* Render Auto-Detected Object Dots */}
                        {domObjects.map((obj) => {
                          const centerX = (obj.box.xmin + obj.box.xmax) / 2 / 10;
                          const centerY = (obj.box.ymin + obj.box.ymax) / 2 / 10;
                          return (
                             <div
                                key={obj.id}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setIsScanning(true);
                                  try {
                                    const { ymin, xmin, ymax, xmax } = obj.box;
                                    const cropped = await cropImageSnippet(screenSnapshot!, [ymin, xmin, ymax, xmax]);
                                    await runGoogleLensScreenAnalysis(cropped);
                                  } catch (err) {
                                    setIsScanning(false);
                                  }
                                }}
                                className="absolute w-8 h-8 -ml-4 -mt-4 bg-white/20 backdrop-blur-md border border-white/40 rounded-full cursor-pointer flex items-center justify-center animate-pulse hover:scale-125 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.8)] z-40"
                                style={{ left: `${centerX}%`, top: `${centerY}%` }}
                             >
                               <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,1)]" />
                             </div>
                          );
                        })}

                        {/* Pulsing scanning overlay if processing */}
                        {isScanning && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none z-50">
                            <div className="w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse absolute top-1/2 left-0 right-0 transform -translate-y-1/2" />
                            <MaterialIcon icon="auto_awesome" size={32} className="text-orange-400 animate-spin" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-[340px] flex flex-col items-center justify-center text-stone-400 space-y-2">
                        <MaterialIcon icon="image" size={36} />
                        <span className="text-xs">Capturing screen layout...</span>
                      </div>
                    )}
                  </div>
                </div>"""

content = content.replace(jsx_original, jsx_replacement)

# Update descriptive text to reflect new behavior
desc_orig = '{currentItem?.description || "Select an object by drawing or clicking on the screen capture to run Spresso Google Lens."}'
desc_new = '{currentItem?.description || "Tap on any glowing dot on the screen capture to instantly identify the object with Spresso Lens."}'
content = content.replace(desc_orig, desc_new)

empty_state_orig = '<p className="text-sm font-bold text-white/50">Draw over or click the screenshot above to identify items</p>'
empty_state_new = '<p className="text-sm font-bold text-white/50">Tap a glowing dot on the screenshot to identify items</p>'
content = content.replace(empty_state_orig, empty_state_new)

with open("src/components/GoogleLensScreenWidgetModal.tsx", "w") as f:
    f.write(content)
print("Refactoring complete.")
