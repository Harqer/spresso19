import os

with open("composeApp/src/commonMain/kotlin/components/pages/TravelTripsPage.kt", "r") as f:
    lines = f.readlines()

def write_file(path, package_name, import_lines, content_lines):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(f"package {package_name}\n\n")
        f.writelines(import_lines)
        f.write("\n")
        f.writelines(content_lines)

imports = lines[2:30]

models = lines[30:73]
write_file("composeApp/src/commonMain/kotlin/components/models/TravelModels.kt", "components.models", imports, models)

header = lines[163:248]
write_file("composeApp/src/commonMain/kotlin/components/organisms/TravelHeaderBanner.kt", "components.organisms", imports + ["import components.models.*\n"], header)

hero = lines[249:347]
write_file("composeApp/src/commonMain/kotlin/components/organisms/TravelActiveTripHeroBanner.kt", "components.organisms", imports + ["import components.models.*\n"], hero)

boarding = lines[348:531]
write_file("composeApp/src/commonMain/kotlin/components/organisms/TravelBoardingPassList.kt", "components.organisms", imports + ["import components.models.*\n"], boarding)

voice = lines[531:634]
write_file("composeApp/src/commonMain/kotlin/components/organisms/TravelVoiceNotesSection.kt", "components.organisms", imports + ["import components.models.*\n"], voice)

budget = lines[634:716]
write_file("composeApp/src/commonMain/kotlin/components/organisms/TravelBudgetOverviewCard.kt", "components.organisms", imports + ["import components.models.*\n"], budget)

receipt = lines[716:920]
write_file("composeApp/src/commonMain/kotlin/components/organisms/TravelReceiptScannerSection.kt", "components.organisms", imports + ["import components.models.*\n"], receipt)

qr = lines[920:1008]
write_file("composeApp/src/commonMain/kotlin/components/molecules/TravelQrModal.kt", "components.molecules", imports + ["import components.models.*\n"], qr)

page = lines[:30] + ["import components.models.*\n", "import components.organisms.*\n", "import components.molecules.*\n\n"] + lines[74:163]
with open("composeApp/src/commonMain/kotlin/components/pages/TravelTripsPage.kt", "w") as f:
    f.writelines(page)

