package components.features.travel

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.models.*
import kotlinx.coroutines.launch

@Composable
fun TravelTripsPage(
    initialTrips: List<TripRecord> = emptyList(),
    initialEvents: List<ItineraryEvent> = emptyList(),
    initialExpenses: List<TravelExpense> = emptyList(),
    initialVoiceNotes: List<VoiceNote> = emptyList(),
    apiClient: network.ApiClient = remember { network.ApiClient() },
    onAskAI: (String) -> Unit = {},
) {
    var trips by remember { mutableStateOf(initialTrips) }
    var events by remember { mutableStateOf(initialEvents) }
    var expenses by remember { mutableStateOf(initialExpenses) }
    var voiceNotes by remember { mutableStateOf(initialVoiceNotes) }

    var activeTripId by remember { mutableStateOf(trips.firstOrNull()?.id ?: "") }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        try {
            val fetchedTrips = apiClient.fetchTravelTrips()
            if (fetchedTrips.isNotEmpty()) {
                trips = fetchedTrips
                if (activeTripId.isEmpty() || trips.none { it.id == activeTripId }) {
                    activeTripId = trips.first().id
                }

                // Fetch associated data for all trips
                val fetchedEvents = mutableListOf<ItineraryEvent>()
                val fetchedExpenses = mutableListOf<TravelExpense>()
                val fetchedVoiceNotes = mutableListOf<VoiceNote>()

                for (trip in fetchedTrips) {
                    try {
                        fetchedEvents.addAll(apiClient.fetchTravelEvents(trip.id))
                        fetchedExpenses.addAll(apiClient.fetchTravelExpenses(trip.id))
                        fetchedVoiceNotes.addAll(apiClient.fetchVoiceNotes(trip.id))
                    } catch (e: Exception) {
                        // Ignore individual trip fetch errors
                    }
                }

                events = fetchedEvents
                expenses = fetchedExpenses
                voiceNotes = fetchedVoiceNotes
            }
        } catch (e: Exception) {
            snackbarHostState.showSnackbar("Failed to load trips: ${e.message}")
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

    val speechRecognizer =
        ui.rememberSpeechRecognizer(
            onResult = { text ->
                isRecording = false

                scope.launch {
                    try {
                        network.SpressoBackend.createVoiceNote(tripId = activeTripId, transcript = text)
                        snackbarHostState.showSnackbar("Voice note saved!")
                    } catch (e: Exception) {
                        snackbarHostState.showSnackbar("Failed to save voice note: ${e.message}")
                    }
                }
            },
            onError = {
                isRecording = false
                scope.launch {
                    snackbarHostState.showSnackbar("Speech recognition error. Please try again.")
                }
            },
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
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.surface)
                        .consumeWindowInsets(innerPadding)
                        .imePadding()
                        .verticalScroll(rememberScrollState())
                        .padding(innerPadding)
                        .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(32.dp),
            ) {
                HeaderBanner(trips, activeTripId) { activeTripId = it }

                if (trips.isEmpty()) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Text(
                            "No Upcoming Trips",
                            style = MaterialTheme.typography.headlineMedium,
                            color = MaterialTheme.colorScheme.onBackground,
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Time to start planning your next adventure!",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else if (currentTrip != null) {
                    ActiveTripHeroBanner(currentTrip, onAskAI)

                    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
                        BoardingPassList(tripEvents) { activeQrModalEvent = it }
                        VoiceNotesSection(tripVoiceNotes, isRecording) { toggleRecording() }
                        BudgetOverviewCard(currentTrip, tripExpenses)
                        ReceiptScannerSection(
                            activeTripId = activeTripId,
                            tripExpenses = tripExpenses,
                            onAddExpense = { expense ->
                                scope.launch {
                                    try {
                                        network.SpressoBackend.createTravelExpense(
                                            tripId = activeTripId,
                                            amount = expense.amount,
                                            currency = expense.currency,
                                            category = expense.category,
                                            merchant = expense.merchant,
                                            items = null,
                                        )
                                        snackbarHostState.showSnackbar("Expense added!")
                                    } catch (e: Exception) {
                                        snackbarHostState.showSnackbar("Failed to add expense: ${e.message}")
                                    }
                                }
                            },
                        )
                    }
                }
            }

            activeQrModalEvent?.let { event ->
                QrModal(event) { activeQrModalEvent = null }
            }
        }
    }
}
