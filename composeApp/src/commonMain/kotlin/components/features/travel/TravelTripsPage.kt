package components.features.travel

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
    val convexApi = remember { network.ConvexApi() }

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
            val detail = apiClient.fetchTravelDetail(activeTripId)
            events = events.filterNot { it.tripId == activeTripId } + detail.events
            expenses = expenses.filterNot { it.tripId == activeTripId } + detail.expenses
            voiceNotes = voiceNotes.filterNot { it.tripId == activeTripId } + detail.voiceNotes
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
    val scope = rememberCoroutineScope()
    var activeQrModalEvent by remember { mutableStateOf<ItineraryEvent?>(null) }

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
                        BudgetOverviewCard(currentTrip, tripExpenses)
                        ReceiptScannerSection(
                            activeTripId = activeTripId,
                            tripExpenses = tripExpenses,
                            onAddExpense = { expense ->
                                scope.launch {
                                    try {
                                        val saved =
                                            convexApi.addTravelExpense(
                                                tripId = activeTripId,
                                                amount = expense.amount,
                                                currency = expense.currency,
                                                category = expense.category,
                                                merchant = expense.merchant,
                                            )
                                        check(saved) { "Expense was not saved." }
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
                QrModal(activeQrModalEvent = event, onClose = { activeQrModalEvent = null })
            }
        }
    }
}
