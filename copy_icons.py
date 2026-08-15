from PIL import Image
import os

logo_path = "/home/shaolin/.gemini/antigravity/brain/af3ccc2f-2ebf-4943-bfe8-82e61331c496/spresso_logo_symbol_1786724508413.jpg"
res_dir = "composeApp/src/androidMain/res"

sizes = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192
}

img = Image.open(logo_path).convert("RGBA")

for density, size in sizes.items():
    d_dir = os.path.join(res_dir, f"mipmap-{density}")
    os.makedirs(d_dir, exist_ok=True)
    
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(os.path.join(d_dir, "ic_launcher.png"), "PNG")
    resized.save(os.path.join(d_dir, "ic_launcher_round.png"), "PNG")

print("Done generating icons with Pillow")
