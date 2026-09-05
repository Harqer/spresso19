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
    var isLoading by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf<String?>(null) }

    var activeTripId by remember { mutableStateOf(trips.firstOrNull()?.id ?: "") }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        try {
            val fetchedTrips = apiClient.fetchTravelTrips()
            trips = fetchedTrips
            if (fetchedTrips.isNotEmpty() && (activeTripId.isEmpty() || fetchedTrips.none { it.id == activeTripId })) {
                activeTripId = fetchedTrips.first().id
            }
        } catch (e: Exception) {
            loadError = "Unable to load your trips. Please try again."
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(activeTripId) {
        if (activeTripId.isBlank()) return@LaunchedEffect
        try {
            val activeEvents = apiClient.fetchTravelEvents(activeTripId)
            val activeExpenses = apiClient.fetchTravelExpenses(activeTripId)
            val activeVoiceNotes = apiClient.fetchVoiceNotes(activeTripId)
            events = events.filterNot { it.tripId == activeTripId } + activeEvents
            expenses = expenses.filterNot { it.tripId == activeTripId } + activeExpenses
            voiceNotes = voiceNotes.filterNot { it.tripId == activeTripId } + activeVoiceNotes
            loadError = null
        } catch (e: Exception) {
            loadError = "Some trip details are unavailable. Please try again."
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
                        val refreshed = apiClient.fetchVoiceNotes(activeTripId)
                        voiceNotes = voiceNotes.filterNot { it.tripId == activeTripId } + refreshed
                        snackbarHostState.showSnackbar("Voice note saved.")
                    } catch (e: Exception) {
                        snackbarHostState.showSnackbar("Unable to save this voice note. Please try again.")
                    }
                }
            },
            onError = {
                isRecording = false
                scope.launch {
                    snackbarHostState.showSnackbar("I couldn't understand that recording. Please try again.")
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

                loadError?.let { message ->
                    Text(message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
                }

                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
                } else if (trips.isEmpty() && loadError == null) {
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
                                        val refreshed = apiClient.fetchTravelExpenses(activeTripId)
                                        expenses = expenses.filterNot { it.tripId == activeTripId } + refreshed
                                        snackbarHostState.showSnackbar("Expense added.")
                                    } catch (e: Exception) {
                                        snackbarHostState.showSnackbar("Unable to add this expense. Please try again.")
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
