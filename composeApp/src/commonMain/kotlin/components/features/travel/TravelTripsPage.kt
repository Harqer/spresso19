package components.features.travel

import components.models.*

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch


@Composable
fun TravelTripsPage(
    initialTrips: List<TripRecord> = emptyList(),
    initialEvents: List<ItineraryEvent> = emptyList(),
    initialExpenses: List<TravelExpense> = emptyList(),
    initialVoiceNotes: List<VoiceNote> = emptyList(),
    onAskAI: (String) -> Unit = {}
) {
    var trips by remember { mutableStateOf(initialTrips) }
    var events by remember { mutableStateOf(initialEvents) }
    var expenses by remember { mutableStateOf(initialExpenses) }
    var voiceNotes by remember { mutableStateOf(initialVoiceNotes) }

    var activeTripId by remember { mutableStateOf(trips.firstOrNull()?.id ?: "") }

    LaunchedEffect(trips) {
        if (activeTripId.isEmpty() && trips.isNotEmpty()) {
            activeTripId = trips.first().id
        }
    }

    val currentTrip = trips.find { it.id == activeTripId } ?: trips.firstOrNull()
    val tripEvents = events.filter { it.tripId == activeTripId }
    val tripExpenses = expenses.filter { it.tripId == activeTripId }
    val tripVoiceNotes = voiceNotes.filter { it.tripId == activeTripId }

    val scope = rememberCoroutineScope()
    var isRecording by remember { mutableStateOf(false) }
    var activeQrModalEvent by remember { mutableStateOf<ItineraryEvent?>(null) }

    fun toggleRecording() {
        if (!isRecording) {
            isRecording = true
            scope.launch {
                delay(2500)
                val note = VoiceNote(
                    id = "vn-${System.currentTimeMillis()}",
                    tripId = activeTripId,
                    transcript = "Check out Le Bon Marché department store for designer wardrobe items and sample French perfumes on Day 3.",
                    createdAt = "Just now"
                )
                voiceNotes = listOf(note) + voiceNotes
                isRecording = false
            }
        } else {
            isRecording = false
        }
    }

    Scaffold { innerPadding ->
        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.surface)
                    .consumeWindowInsets(innerPadding)
                    .imePadding()
                    .verticalScroll(rememberScrollState())
                    .padding(innerPadding)
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(32.dp)
            ) {
            HeaderBanner(trips, activeTripId) { activeTripId = it }

            if (currentTrip != null) {
                ActiveTripHeroBanner(currentTrip, onAskAI)
            }

            Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
                BoardingPassList(tripEvents) { activeQrModalEvent = it }
                VoiceNotesSection(tripVoiceNotes, isRecording) { toggleRecording() }
                BudgetOverviewCard(currentTrip, tripExpenses)
                ReceiptScannerSection(
                    activeTripId = activeTripId,
                    tripExpenses = tripExpenses,
                    onAddExpense = { expenses = listOf(it) + expenses }
                )
            }
        }

        activeQrModalEvent?.let { event ->
            QrModal(event) { activeQrModalEvent = null }
        }
    }
    }
}

