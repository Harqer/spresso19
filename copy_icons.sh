#!/bin/bash
LOGO="/home/shaolin/.gemini/antigravity/brain/af3ccc2f-2ebf-4943-bfe8-82e61331c496/spresso_logo_symbol_1786724508413.jpg"
RES_DIR="composeApp/src/androidMain/res"

# Generate rounded PNG icons using ImageMagick
for dir in mipmap-mdpi mipmap-hdpi mipmap-xhdpi mipmap-xxhdpi mipmap-xxxhdpi; do
  mkdir -p "$RES_DIR/$dir"
done

convert "$LOGO" -resize 48x48 "$RES_DIR/mipmap-mdpi/ic_launcher.png"
convert "$LOGO" -resize 72x72 "$RES_DIR/mipmap-hdpi/ic_launcher.png"
convert "$LOGO" -resize 96x96 "$RES_DIR/mipmap-xhdpi/ic_launcher.png"
convert "$LOGO" -resize 144x144 "$RES_DIR/mipmap-xxhdpi/ic_launcher.png"
convert "$LOGO" -resize 192x192 "$RES_DIR/mipmap-xxxhdpi/ic_launcher.png"

convert "$LOGO" -resize 48x48 "$RES_DIR/mipmap-mdpi/ic_launcher_round.png"
convert "$LOGO" -resize 72x72 "$RES_DIR/mipmap-hdpi/ic_launcher_round.png"
convert "$LOGO" -resize 96x96 "$RES_DIR/mipmap-xhdpi/ic_launcher_round.png"
convert "$LOGO" -resize 144x144 "$RES_DIR/mipmap-xxhdpi/ic_launcher_round.png"
convert "$LOGO" -resize 192x192 "$RES_DIR/mipmap-xxxhdpi/ic_launcher_round.png"

echo "Done generating icons"
