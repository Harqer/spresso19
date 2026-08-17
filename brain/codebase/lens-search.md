# Lens Search API & Response Mapping

When utilizing the `ApiClient.performLensSearch` API endpoint for OCR or image detection tasks (e.g., receipt parsing, product lookups), the response object `LensSearchResponse` does **not** contain native flattened properties like `merchant`, `amount`, `name`, or `price`. 

Instead, the results are nested within `DetectedItem` (inside `detectedResult.detectedItems`) or `ApifyProductMatch` (inside `apifyResults`).

### Correct Data Mapping Pattern

To extract information like merchant/brand and pricing, use the following pattern:

```kotlin
val client = network.ApiClient()
val response = client.performLensSearch(base64Image)

// Extract the primary item
val firstItem = response.detectedResult?.detectedItems?.firstOrNull()

// Map Merchant / Brand
val merchantName = firstItem?.brandGuess 
    ?: firstItem?.detectedName 
    ?: response.apifyResults.firstOrNull()?.title 
    ?: "Unknown"

// Map Amount / Price
val priceAmount = firstItem?.priceEstimate?.toString() 
    ?: response.apifyResults.firstOrNull()?.price?.toString() 
    ?: "0.0"
```

### Key Object Types
- `DetectedItem`: Contains `detectedName`, `brandGuess`, `priceEstimate`, `category`, and `confidenceScore`.
- `ApifyProductMatch`: Contains `title`, `price`.

Always prefer using actual API models instead of injecting mock `TODO()` values or hardcoded `delay()` blocks.
