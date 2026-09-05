package network

/**
 * Returns a short-lived Firebase App Check token for outbound HTTP calls to
 * authenticated web API routes. Null when App Check is not configured for the
 * platform, in which case the caller omits the header.
 */
expect suspend fun getCurrentAppCheckToken(): String?
