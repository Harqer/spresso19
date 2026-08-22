package network

class GenerativeAiService {
    private val apiClient = ApiClient()

    suspend fun generateResponseFromAudio(
        prompt: String,
        audioData: ByteArray,
        mimeType: String = "audio/mp3",
    ): String = apiClient.generateResponseFromAudio(prompt, audioData, mimeType)
}
