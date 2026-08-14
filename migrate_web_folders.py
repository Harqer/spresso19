import os
import shutil
import re

base_dir = "src/components"

mappings = {
    "atoms/MicButton.tsx": "shared/MicButton.tsx",
    "atoms/IconButton.tsx": "shared/IconButton.tsx",
    "atoms/ChatGroundingSources.tsx": "features/chat/ChatGroundingSources.tsx",
    "atoms/WardrobeBadge.tsx": "features/wardrobe/WardrobeBadge.tsx",
    "atoms/ProductPriceTag.tsx": "features/catalog/ProductPriceTag.tsx",
    "atoms/GoogleLensBoundingBox.tsx": "features/vision/GoogleLensBoundingBox.tsx",
    "atoms/ChatSuggestionChip.tsx": "features/chat/ChatSuggestionChip.tsx",
    "atoms/ChatThoughtBox.tsx": "features/chat/ChatThoughtBox.tsx",
    "atoms/ChatBubbleText.tsx": "features/chat/ChatBubbleText.tsx",
    "atoms/FluidShaderCanvas.tsx": "shared/FluidShaderCanvas.tsx",
    "atoms/ChatMicButton.tsx": "features/chat/ChatMicButton.tsx",
    "atoms/GoogleWalletButton.tsx": "features/profile/GoogleWalletButton.tsx",
    "atoms/AgentAvatarBadge.tsx": "features/chat/AgentAvatarBadge.tsx",
    "atoms/WardrobeTabChip.tsx": "features/wardrobe/WardrobeTabChip.tsx",
    "atoms/UserAvatar.tsx": "features/profile/UserAvatar.tsx",
    
    "molecules/GoogleLensCategoryTabs.tsx": "features/vision/GoogleLensCategoryTabs.tsx",
    "molecules/AttachmentChipsBar.tsx": "shared/AttachmentChipsBar.tsx",
    "molecules/ProblemDetailsCard.tsx": "shared/ProblemDetailsCard.tsx",
    "molecules/GoogleLensHeaderBar.tsx": "features/vision/GoogleLensHeaderBar.tsx",
    "molecules/AgentTemplateCard.tsx": "features/chat/AgentTemplateCard.tsx",
    "molecules/ChatMessageHeader.tsx": "features/chat/ChatMessageHeader.tsx",
    "molecules/WardrobeItemCard.tsx": "features/wardrobe/WardrobeItemCard.tsx",
    "molecules/AnimatedTicketCard.tsx": "features/orders/AnimatedTicketCard.tsx",
    "molecules/VideoReviewItem.tsx": "shared/VideoReviewItem.tsx",
    "molecules/ProductCatalogCard.tsx": "features/catalog/ProductCatalogCard.tsx",
    "molecules/HeaderNavBar.tsx": "shared/HeaderNavBar.tsx",
    "molecules/MerchantTrustBadge.tsx": "shared/MerchantTrustBadge.tsx",
    "molecules/WardrobeHeaderToolbar.tsx": "features/wardrobe/WardrobeHeaderToolbar.tsx",
    "molecules/ChatProductCard.tsx": "features/chat/ChatProductCard.tsx",
    "molecules/ChatAudioControls.tsx": "features/chat/ChatAudioControls.tsx",
    
    "organisms/ProductCatalogGrid.tsx": "features/catalog/ProductCatalogGrid.tsx",
    "organisms/WardrobeItemGrid.tsx": "features/wardrobe/WardrobeItemGrid.tsx",
    "organisms/WardrobeMixMatchTab.tsx": "features/wardrobe/WardrobeMixMatchTab.tsx",
    "organisms/WardrobeSeasonalTab.tsx": "features/wardrobe/WardrobeSeasonalTab.tsx",
    "organisms/WardrobeSavedOutfitsTab.tsx": "features/wardrobe/WardrobeSavedOutfitsTab.tsx",
    "organisms/GoogleLensResultCard.tsx": "features/vision/GoogleLensResultCard.tsx",
    "organisms/WardrobeLikedTab.tsx": "features/wardrobe/WardrobeLikedTab.tsx",
    "organisms/NavigationDrawer.tsx": "shared/NavigationDrawer.tsx",
    "organisms/CreatorAgentChatPanel.tsx": "features/chat/CreatorAgentChatPanel.tsx",
    "organisms/AppModalManager.tsx": "shared/AppModalManager.tsx",
    "organisms/Product360SpinModal.tsx": "features/catalog/Product360SpinModal.tsx",
    "organisms/WardrobeAiOutfitTab.tsx": "features/wardrobe/WardrobeAiOutfitTab.tsx",
    "organisms/WardrobeUploadModal.tsx": "features/wardrobe/WardrobeUploadModal.tsx",
    
    "pages/ProfilePage.tsx": "features/profile/ProfilePage.tsx",
    "pages/WardrobePage.tsx": "features/wardrobe/WardrobePage.tsx",
    "pages/MainAppPage.tsx": "shared/MainAppPage.tsx",
    "pages/PersonalAIShopperChatPage.tsx": "features/chat/PersonalAIShopperChatPage.tsx",
    "pages/CreatorGenAIAgentsChatPage.tsx": "features/chat/CreatorGenAIAgentsChatPage.tsx",
    "pages/WardrobeViewPage.tsx": "features/wardrobe/WardrobeViewPage.tsx",
    "pages/ProductCatalogPage.tsx": "features/catalog/ProductCatalogPage.tsx",
    "pages/TravelTripsPage.tsx": "features/travel/TravelTripsPage.tsx",
}

# 1. Create directories and move files
for old_path, new_path in mappings.items():
    src = os.path.join(base_dir, old_path)
    dst = os.path.join(base_dir, new_path)
    if os.path.exists(src):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.move(src, dst)
        print(f"Moved {old_path} to {new_path}")

# 2. Fix imports across all src/ files
# Create reverse mapping to know where a file ended up
file_locations = {}
for old, new in mappings.items():
    filename = os.path.basename(old)
    # the import will just be like '../atoms/MicButton' -> '../shared/MicButton'
    file_locations[filename.replace('.tsx', '')] = new.replace('.tsx', '')

def update_imports(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Simple regex to catch imports from components/(atoms|molecules|organisms|pages)
    # In React apps, imports are usually: import X from '@/components/atoms/X' or '../../atoms/X'
    
    # We will just replace any occurrence of "components/atoms/X", "components/molecules/X", etc.
    # And relative imports like "../atoms/X" or "../../atoms/X"
    
    # Actually, simpler: for every file in mappings, replace:
    # "atoms/FileName" -> "features/domain/FileName"
    # "molecules/FileName" -> "features/domain/FileName"
    # "organisms/FileName" -> "features/domain/FileName"
    # "pages/FileName" -> "features/domain/FileName"
    
    new_content = content
    for old, new in mappings.items():
        old_no_ext = old.replace(".tsx", "")
        new_no_ext = new.replace(".tsx", "")
        # replace absolute-ish imports (e.g. from '@/components/atoms/X')
        new_content = new_content.replace(f"components/{old_no_ext}", f"components/{new_no_ext}")
        
        # for relative imports, like '../atoms/X' -> '../features/chat/X'
        # this is tricky, let's just do a regex replace for the ending parts.
        # find anything matching /atoms/X, /molecules/X, etc and replace with /features/domain/X
        import_pattern = r'([\'"])(?:\.\./)+atoms/' + os.path.basename(old_no_ext) + r'([\'"])'
        new_content = re.sub(import_pattern, r'\1@/components/' + new_no_ext + r'\2', new_content)
        
        import_pattern = r'([\'"])(?:\.\./)+molecules/' + os.path.basename(old_no_ext) + r'([\'"])'
        new_content = re.sub(import_pattern, r'\1@/components/' + new_no_ext + r'\2', new_content)
        
        import_pattern = r'([\'"])(?:\.\./)+organisms/' + os.path.basename(old_no_ext) + r'([\'"])'
        new_content = re.sub(import_pattern, r'\1@/components/' + new_no_ext + r'\2', new_content)

        import_pattern = r'([\'"])(?:\.\./)+pages/' + os.path.basename(old_no_ext) + r'([\'"])'
        new_content = re.sub(import_pattern, r'\1@/components/' + new_no_ext + r'\2', new_content)

        # Also replace ./atoms/X
        import_pattern = r'([\'"])\./atoms/' + os.path.basename(old_no_ext) + r'([\'"])'
        new_content = re.sub(import_pattern, r'\1@/components/' + new_no_ext + r'\2', new_content)
        import_pattern = r'([\'"])\./molecules/' + os.path.basename(old_no_ext) + r'([\'"])'
        new_content = re.sub(import_pattern, r'\1@/components/' + new_no_ext + r'\2', new_content)
        import_pattern = r'([\'"])\./organisms/' + os.path.basename(old_no_ext) + r'([\'"])'
        new_content = re.sub(import_pattern, r'\1@/components/' + new_no_ext + r'\2', new_content)
        import_pattern = r'([\'"])\./pages/' + os.path.basename(old_no_ext) + r'([\'"])'
        new_content = re.sub(import_pattern, r'\1@/components/' + new_no_ext + r'\2', new_content)

        # What if it's just from './FileName' ? That happens if they were in the same dir.
        # But we moved them to different dirs. 
        # Safest way: if we see an import that is literally just "from './FileName'", 
        # and FileName is in our list, we must know what file we are currently in to resolve it.
        # It's much easier to just convert ALL local component imports to absolute imports `@/components/...`
        
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
            
for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            update_imports(os.path.join(root, file))

print("Done migrating web folders and fixing imports.")
