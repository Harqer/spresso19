package components.models



data class TripRecord(
    val id: String,
    val title: String,
    val destination: String,
    val startDate: String,
    val endDate: String,
    val status: String,
    val coverImage: String,
    val budgetTotal: Double,
    val spentTotal: Double
)

data class ItineraryEvent(
    val id: String,
    val tripId: String,
    val type: String,
    val title: String,
    val description: String,
    val eventTime: String,
    val location: String,
    val price: Double? = null,
    val qrData: String? = null,
    val confirmationCode: String? = null,
    val gate: String? = null,
    val seat: String? = null
)

data class TravelExpense(
    val id: String,
    val tripId: String,
    val amount: Double,
    val currency: String,
    val category: String,
    val merchant: String,
    val date: String
)

data class VoiceNote(
    val id: String,
    val tripId: String,
    val transcript: String,
    val createdAt: String
)
