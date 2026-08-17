package network

/**
 * Platform-specific helper to call Firebase Cloud Functions directly using the official SDK.
 * 
 * @param functionName The name of the Cloud Function to call.
 * @param dataJson The request data serialized as a JSON string.
 * @return The response data serialized as a JSON string.
 */
expect suspend fun callFirebaseFunction(functionName: String, dataJson: String): String
