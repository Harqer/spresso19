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
    apiClient: network.ApiClient = remember { network.ApiClient() },
    onAskAI: (String) -> Unit = {}
) {
    var trips by remember { mutableStateOf(initialTrips) }
    var events by remember { mutableStateOf(initialEvents) }
    var expenses by remember { mutableStateOf(initialExpenses) }
    var voiceNotes by remember { mutableStateOf(initialVoiceNotes) }

    var activeTripId by remember { mutableStateOf(trips.firstOrNull()?.id ?: "") }

    LaunchedEffect(Unit) {
        val fetchedTrips = apiClient.fetchTravelTrips()
        if (fetchedTrips.isNotEmpty()) {
            trips = fetchedTrips
            if (activeTripId.isEmpty() || trips.none { it.id == activeTripId }) {
                activeTripId = trips.first().id
            }
        }
    }

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

    val snackbarHostState = remember { SnackbarHostState() }

    val speechRecognizer = ui.rememberSpeechRecognizer(
        onResult = { text ->
            isRecording = false
            val newNote = VoiceNote(
                id = "note-${kotlin.random.Random.nextInt()}",
                tripId = activeTripId,
                transcript = text,
                createdAt = "Just now"
            )
            scope.launch {
                snackbarHostState.showSnackbar("Unable to save voice note right now. Please try again.")
            }
        },
        onError = { 
            isRecording = false 
        }
    )

    fun toggleRecording() {
        if (!isRecording) {
            isRecording = true
            speechRecognizer()
        } else {
            isRecording = false
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
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
                    onAddExpense = {
                        scope.launch {
                            snackbarHostState.showSnackbar("Unable to add expense right now. Please try again.")
                        }
                    }
                )
            }
        }

        activeQrModalEvent?.let { event ->
            QrModal(event) { activeQrModalEvent = null }
        }
    }
    }
}

