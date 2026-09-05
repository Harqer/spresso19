
@file:Suppress(
    "KotlinRedundantDiagnosticSuppress",
    "PropertyName",
    "MayBeConstant",
    "RedundantVisibilityModifier",
    "RedundantCompanionReference",
    "RemoveEmptyClassBody",
    "SpellCheckingInspection",
    "unused",
)

package com.spresso.dataconnect

import com.google.firebase.dataconnect.getInstance as _fdcGetInstance

public interface SpressoConnectorConnector : com.google.firebase.dataconnect.generated.GeneratedConnector<SpressoConnectorConnector> {
    override val dataConnect: com.google.firebase.dataconnect.FirebaseDataConnect

    public val addGroceryItem: AddGroceryItemMutation

    public val addVideo: AddVideoMutation

    public val addWardrobeItem: AddWardrobeItemMutation

    public val connectCoinbaseWallet: ConnectCoinbaseWalletMutation

    public val createExpense: CreateExpenseMutation

    public val createGroceryList: CreateGroceryListMutation

    public val createOrder: CreateOrderMutation

    public val createPaymentMethod: CreatePaymentMethodMutation

    public val createTravelExpense: CreateTravelExpenseMutation

    public val createVoiceNote: CreateVoiceNoteMutation

    public val createWardrobeOutfit: CreateWardrobeOutfitMutation

    public val deleteGroceryItem: DeleteGroceryItemMutation

    public val deletePaymentMethod: DeletePaymentMethodMutation

    public val getCreativeTemplates: GetCreativeTemplatesQuery

    public val getCreatorAgents: GetCreatorAgentsQuery

    public val getGroceryList: GetGroceryListQuery

    public val getItineraryEvents: GetItineraryEventsQuery

    public val getOnboardingStatus: GetOnboardingStatusQuery

    public val getPaymentMethods: GetPaymentMethodsQuery

    public val getProductById: GetProductByIdQuery

    public val getTravelExpenses: GetTravelExpensesQuery

    public val getTrips: GetTripsQuery

    public val getUserCart: GetUserCartQuery

    public val getUserOrders: GetUserOrdersQuery

    public val getUserPreference: GetUserPreferenceQuery

    public val getUserPreferences: GetUserPreferencesQuery

    public val getUserProfile: GetUserProfileQuery

    public val getUserSubscription: GetUserSubscriptionQuery

    public val getUserVideos: GetUserVideosQuery

    public val getVisionHistory: GetVisionHistoryQuery

    public val getVoiceNotes: GetVoiceNotesQuery

    public val getWardrobeItems: GetWardrobeItemsQuery

    public val getWardrobeOutfits: GetWardrobeOutfitsQuery

    public val listProducts: ListProductsQuery

    public val logVisionEvent: LogVisionEventMutation

    public val toggleGroceryItem: ToggleGroceryItemMutation

    public val toggleLike: ToggleLikeMutation

    public val updateOnboardingStatus: UpdateOnboardingStatusMutation

    public val upsertUserPreference: UpsertUserPreferenceMutation

    public val upsertUserProfile: UpsertUserProfileMutation

    public val upsertUserSubscription: UpsertUserSubscriptionMutation

    public companion object {
        @Suppress("MemberVisibilityCanBePrivate")
        public val config: com.google.firebase.dataconnect.ConnectorConfig =
            com.google.firebase.dataconnect.ConnectorConfig(
                connector = "spresso-connector",
                location = "us-central1",
                serviceId = "spresso-dataconnect",
            )

        public fun getInstance(dataConnect: com.google.firebase.dataconnect.FirebaseDataConnect): SpressoConnectorConnector =
            synchronized(instances) {
                instances.getOrPut(dataConnect) {
                    SpressoConnectorConnectorImpl(dataConnect)
                }
            }

        private val instances = java.util.WeakHashMap<com.google.firebase.dataconnect.FirebaseDataConnect, SpressoConnectorConnectorImpl>()
    }
}

public val SpressoConnectorConnector.Companion.instance: SpressoConnectorConnector
    get() =
        getInstance(
            com.google.firebase.dataconnect.FirebaseDataConnect._fdcGetInstance(
                config,
            ),
        )

public fun SpressoConnectorConnector.Companion.getInstance(
    settings: com.google.firebase.dataconnect.DataConnectSettings =
        com.google.firebase.dataconnect
            .DataConnectSettings(),
): SpressoConnectorConnector =
    getInstance(
        com.google.firebase.dataconnect.FirebaseDataConnect
            ._fdcGetInstance(config, settings),
    )

public fun SpressoConnectorConnector.Companion.getInstance(
    app: com.google.firebase.FirebaseApp,
    settings: com.google.firebase.dataconnect.DataConnectSettings =
        com.google.firebase.dataconnect
            .DataConnectSettings(),
): SpressoConnectorConnector =
    getInstance(
        com.google.firebase.dataconnect.FirebaseDataConnect
            ._fdcGetInstance(app, config, settings),
    )

private class SpressoConnectorConnectorImpl(
    override val dataConnect: com.google.firebase.dataconnect.FirebaseDataConnect,
) : SpressoConnectorConnector {
    override val addGroceryItem by lazy(LazyThreadSafetyMode.PUBLICATION) {
        AddGroceryItemMutationImpl(this)
    }

    override val addVideo by lazy(LazyThreadSafetyMode.PUBLICATION) {
        AddVideoMutationImpl(this)
    }

    override val addWardrobeItem by lazy(LazyThreadSafetyMode.PUBLICATION) {
        AddWardrobeItemMutationImpl(this)
    }

    override val connectCoinbaseWallet by lazy(LazyThreadSafetyMode.PUBLICATION) {
        ConnectCoinbaseWalletMutationImpl(this)
    }

    override val createExpense by lazy(LazyThreadSafetyMode.PUBLICATION) {
        CreateExpenseMutationImpl(this)
    }

    override val createGroceryList by lazy(LazyThreadSafetyMode.PUBLICATION) {
        CreateGroceryListMutationImpl(this)
    }

    override val createOrder by lazy(LazyThreadSafetyMode.PUBLICATION) {
        CreateOrderMutationImpl(this)
    }

    override val createPaymentMethod by lazy(LazyThreadSafetyMode.PUBLICATION) {
        CreatePaymentMethodMutationImpl(this)
    }

    override val createTravelExpense by lazy(LazyThreadSafetyMode.PUBLICATION) {
        CreateTravelExpenseMutationImpl(this)
    }

    override val createVoiceNote by lazy(LazyThreadSafetyMode.PUBLICATION) {
        CreateVoiceNoteMutationImpl(this)
    }

    override val createWardrobeOutfit by lazy(LazyThreadSafetyMode.PUBLICATION) {
        CreateWardrobeOutfitMutationImpl(this)
    }

    override val deleteGroceryItem by lazy(LazyThreadSafetyMode.PUBLICATION) {
        DeleteGroceryItemMutationImpl(this)
    }

    override val deletePaymentMethod by lazy(LazyThreadSafetyMode.PUBLICATION) {
        DeletePaymentMethodMutationImpl(this)
    }

    override val getCreativeTemplates by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetCreativeTemplatesQueryImpl(this)
    }

    override val getCreatorAgents by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetCreatorAgentsQueryImpl(this)
    }

    override val getGroceryList by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetGroceryListQueryImpl(this)
    }

    override val getItineraryEvents by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetItineraryEventsQueryImpl(this)
    }

    override val getOnboardingStatus by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetOnboardingStatusQueryImpl(this)
    }

    override val getPaymentMethods by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetPaymentMethodsQueryImpl(this)
    }

    override val getProductById by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetProductByIdQueryImpl(this)
    }

    override val getTravelExpenses by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetTravelExpensesQueryImpl(this)
    }

    override val getTrips by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetTripsQueryImpl(this)
    }

    override val getUserCart by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetUserCartQueryImpl(this)
    }

    override val getUserOrders by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetUserOrdersQueryImpl(this)
    }

    override val getUserPreference by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetUserPreferenceQueryImpl(this)
    }

    override val getUserPreferences by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetUserPreferencesQueryImpl(this)
    }

    override val getUserProfile by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetUserProfileQueryImpl(this)
    }

    override val getUserSubscription by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetUserSubscriptionQueryImpl(this)
    }

    override val getUserVideos by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetUserVideosQueryImpl(this)
    }

    override val getVisionHistory by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetVisionHistoryQueryImpl(this)
    }

    override val getVoiceNotes by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetVoiceNotesQueryImpl(this)
    }

    override val getWardrobeItems by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetWardrobeItemsQueryImpl(this)
    }

    override val getWardrobeOutfits by lazy(LazyThreadSafetyMode.PUBLICATION) {
        GetWardrobeOutfitsQueryImpl(this)
    }

    override val listProducts by lazy(LazyThreadSafetyMode.PUBLICATION) {
        ListProductsQueryImpl(this)
    }

    override val logVisionEvent by lazy(LazyThreadSafetyMode.PUBLICATION) {
        LogVisionEventMutationImpl(this)
    }

    override val toggleGroceryItem by lazy(LazyThreadSafetyMode.PUBLICATION) {
        ToggleGroceryItemMutationImpl(this)
    }

    override val toggleLike by lazy(LazyThreadSafetyMode.PUBLICATION) {
        ToggleLikeMutationImpl(this)
    }

    override val updateOnboardingStatus by lazy(LazyThreadSafetyMode.PUBLICATION) {
        UpdateOnboardingStatusMutationImpl(this)
    }

    override val upsertUserPreference by lazy(LazyThreadSafetyMode.PUBLICATION) {
        UpsertUserPreferenceMutationImpl(this)
    }

    override val upsertUserProfile by lazy(LazyThreadSafetyMode.PUBLICATION) {
        UpsertUserProfileMutationImpl(this)
    }

    override val upsertUserSubscription by lazy(LazyThreadSafetyMode.PUBLICATION) {
        UpsertUserSubscriptionMutationImpl(this)
    }

    @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
    override fun operations(): List<com.google.firebase.dataconnect.generated.GeneratedOperation<SpressoConnectorConnector, *, *>> =
        queries() + mutations()

    @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
    override fun mutations(): List<com.google.firebase.dataconnect.generated.GeneratedMutation<SpressoConnectorConnector, *, *>> =
        listOf(
            addGroceryItem,
            addVideo,
            addWardrobeItem,
            connectCoinbaseWallet,
            createExpense,
            createGroceryList,
            createOrder,
            createPaymentMethod,
            createTravelExpense,
            createVoiceNote,
            createWardrobeOutfit,
            deleteGroceryItem,
            deletePaymentMethod,
            logVisionEvent,
            toggleGroceryItem,
            toggleLike,
            updateOnboardingStatus,
            upsertUserPreference,
            upsertUserProfile,
            upsertUserSubscription,
        )

    @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
    override fun queries(): List<com.google.firebase.dataconnect.generated.GeneratedQuery<SpressoConnectorConnector, *, *>> =
        listOf(
            getCreativeTemplates,
            getCreatorAgents,
            getGroceryList,
            getItineraryEvents,
            getOnboardingStatus,
            getPaymentMethods,
            getProductById,
            getTravelExpenses,
            getTrips,
            getUserCart,
            getUserOrders,
            getUserPreference,
            getUserPreferences,
            getUserProfile,
            getUserSubscription,
            getUserVideos,
            getVisionHistory,
            getVoiceNotes,
            getWardrobeItems,
            getWardrobeOutfits,
            listProducts,
        )

    @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
    override fun copy(dataConnect: com.google.firebase.dataconnect.FirebaseDataConnect) = SpressoConnectorConnectorImpl(dataConnect)

    override fun equals(other: Any?): Boolean =
        other is SpressoConnectorConnectorImpl &&
            other.dataConnect == dataConnect

    override fun hashCode(): Int =
        java.util.Objects.hash(
            "SpressoConnectorConnectorImpl",
            dataConnect,
        )

    override fun toString(): String = "SpressoConnectorConnectorImpl(dataConnect=$dataConnect)"
}

private open class SpressoConnectorConnectorGeneratedQueryImpl<Data, Variables>(
    override val connector: SpressoConnectorConnector,
    override val operationName: String,
    override val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data>,
    override val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables>,
) : com.google.firebase.dataconnect.generated.GeneratedQuery<SpressoConnectorConnector, Data, Variables> {
    @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
    override fun copy(
        connector: SpressoConnectorConnector,
        operationName: String,
        dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data>,
        variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables>,
    ) = SpressoConnectorConnectorGeneratedQueryImpl(
        connector,
        operationName,
        dataDeserializer,
        variablesSerializer,
    )

    @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
    override fun <NewVariables> withVariablesSerializer(variablesSerializer: kotlinx.serialization.SerializationStrategy<NewVariables>) =
        SpressoConnectorConnectorGeneratedQueryImpl(
            connector,
            operationName,
            dataDeserializer,
            variablesSerializer,
        )

    @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
    override fun <NewData> withDataDeserializer(dataDeserializer: kotlinx.serialization.DeserializationStrategy<NewData>) =
        SpressoConnectorConnectorGeneratedQueryImpl(
            connector,
            operationName,
            dataDeserializer,
            variablesSerializer,
        )

    override fun equals(other: Any?): Boolean =
        other is SpressoConnectorConnectorGeneratedQueryImpl<*, *> &&
            other.connector == connector &&
            other.operationName == operationName &&
            other.dataDeserializer == dataDeserializer &&
            other.variablesSerializer == variablesSerializer

    override fun hashCode(): Int =
        java.util.Objects.hash(
            "SpressoConnectorConnectorGeneratedQueryImpl",
            connector,
            operationName,
            dataDeserializer,
            variablesSerializer,
        )

    override fun toString(): String =
        "SpressoConnectorConnectorGeneratedQueryImpl(" +
            "operationName=$operationName, " +
            "dataDeserializer=$dataDeserializer, " +
            "variablesSerializer=$variablesSerializer, " +
            "connector=$connector)"
}

private open class SpressoConnectorConnectorGeneratedMutationImpl<Data, Variables>(
    override val connector: SpressoConnectorConnector,
    override val operationName: String,
    override val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data>,
    override val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables>,
) : com.google.firebase.dataconnect.generated.GeneratedMutation<SpressoConnectorConnector, Data, Variables> {
    @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
    override fun copy(
        connector: SpressoConnectorConnector,
        operationName: String,
        dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data>,
        variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables>,
    ) = SpressoConnectorConnectorGeneratedMutationImpl(
        connector,
        operationName,
        dataDeserializer,
        variablesSerializer,
    )

    @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
    override fun <NewVariables> withVariablesSerializer(variablesSerializer: kotlinx.serialization.SerializationStrategy<NewVariables>) =
        SpressoConnectorConnectorGeneratedMutationImpl(
            connector,
            operationName,
            dataDeserializer,
            variablesSerializer,
        )

    @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
    override fun <NewData> withDataDeserializer(dataDeserializer: kotlinx.serialization.DeserializationStrategy<NewData>) =
        SpressoConnectorConnectorGeneratedMutationImpl(
            connector,
            operationName,
            dataDeserializer,
            variablesSerializer,
        )

    override fun equals(other: Any?): Boolean =
        other is SpressoConnectorConnectorGeneratedMutationImpl<*, *> &&
            other.connector == connector &&
            other.operationName == operationName &&
            other.dataDeserializer == dataDeserializer &&
            other.variablesSerializer == variablesSerializer

    override fun hashCode(): Int =
        java.util.Objects.hash(
            "SpressoConnectorConnectorGeneratedMutationImpl",
            connector,
            operationName,
            dataDeserializer,
            variablesSerializer,
        )

    override fun toString(): String =
        "SpressoConnectorConnectorGeneratedMutationImpl(" +
            "operationName=$operationName, " +
            "dataDeserializer=$dataDeserializer, " +
            "variablesSerializer=$variablesSerializer, " +
            "connector=$connector)"
}

private class AddGroceryItemMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        AddGroceryItemMutation.Data,
        AddGroceryItemMutation.Variables,
    >(
        connector,
        AddGroceryItemMutation.Companion.operationName,
        AddGroceryItemMutation.Companion.dataDeserializer,
        AddGroceryItemMutation.Companion.variablesSerializer,
    ),
    AddGroceryItemMutation

private class AddVideoMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        AddVideoMutation.Data,
        AddVideoMutation.Variables,
    >(
        connector,
        AddVideoMutation.Companion.operationName,
        AddVideoMutation.Companion.dataDeserializer,
        AddVideoMutation.Companion.variablesSerializer,
    ),
    AddVideoMutation

private class AddWardrobeItemMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        AddWardrobeItemMutation.Data,
        AddWardrobeItemMutation.Variables,
    >(
        connector,
        AddWardrobeItemMutation.Companion.operationName,
        AddWardrobeItemMutation.Companion.dataDeserializer,
        AddWardrobeItemMutation.Companion.variablesSerializer,
    ),
    AddWardrobeItemMutation

private class ConnectCoinbaseWalletMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        ConnectCoinbaseWalletMutation.Data,
        ConnectCoinbaseWalletMutation.Variables,
    >(
        connector,
        ConnectCoinbaseWalletMutation.Companion.operationName,
        ConnectCoinbaseWalletMutation.Companion.dataDeserializer,
        ConnectCoinbaseWalletMutation.Companion.variablesSerializer,
    ),
    ConnectCoinbaseWalletMutation

private class CreateExpenseMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        CreateExpenseMutation.Data,
        CreateExpenseMutation.Variables,
    >(
        connector,
        CreateExpenseMutation.Companion.operationName,
        CreateExpenseMutation.Companion.dataDeserializer,
        CreateExpenseMutation.Companion.variablesSerializer,
    ),
    CreateExpenseMutation

private class CreateGroceryListMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        CreateGroceryListMutation.Data,
        CreateGroceryListMutation.Variables,
    >(
        connector,
        CreateGroceryListMutation.Companion.operationName,
        CreateGroceryListMutation.Companion.dataDeserializer,
        CreateGroceryListMutation.Companion.variablesSerializer,
    ),
    CreateGroceryListMutation

private class CreateOrderMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        CreateOrderMutation.Data,
        CreateOrderMutation.Variables,
    >(
        connector,
        CreateOrderMutation.Companion.operationName,
        CreateOrderMutation.Companion.dataDeserializer,
        CreateOrderMutation.Companion.variablesSerializer,
    ),
    CreateOrderMutation

private class CreatePaymentMethodMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        CreatePaymentMethodMutation.Data,
        CreatePaymentMethodMutation.Variables,
    >(
        connector,
        CreatePaymentMethodMutation.Companion.operationName,
        CreatePaymentMethodMutation.Companion.dataDeserializer,
        CreatePaymentMethodMutation.Companion.variablesSerializer,
    ),
    CreatePaymentMethodMutation

private class CreateTravelExpenseMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        CreateTravelExpenseMutation.Data,
        CreateTravelExpenseMutation.Variables,
    >(
        connector,
        CreateTravelExpenseMutation.Companion.operationName,
        CreateTravelExpenseMutation.Companion.dataDeserializer,
        CreateTravelExpenseMutation.Companion.variablesSerializer,
    ),
    CreateTravelExpenseMutation

private class CreateVoiceNoteMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        CreateVoiceNoteMutation.Data,
        CreateVoiceNoteMutation.Variables,
    >(
        connector,
        CreateVoiceNoteMutation.Companion.operationName,
        CreateVoiceNoteMutation.Companion.dataDeserializer,
        CreateVoiceNoteMutation.Companion.variablesSerializer,
    ),
    CreateVoiceNoteMutation

private class CreateWardrobeOutfitMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        CreateWardrobeOutfitMutation.Data,
        CreateWardrobeOutfitMutation.Variables,
    >(
        connector,
        CreateWardrobeOutfitMutation.Companion.operationName,
        CreateWardrobeOutfitMutation.Companion.dataDeserializer,
        CreateWardrobeOutfitMutation.Companion.variablesSerializer,
    ),
    CreateWardrobeOutfitMutation

private class DeleteGroceryItemMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        DeleteGroceryItemMutation.Data,
        DeleteGroceryItemMutation.Variables,
    >(
        connector,
        DeleteGroceryItemMutation.Companion.operationName,
        DeleteGroceryItemMutation.Companion.dataDeserializer,
        DeleteGroceryItemMutation.Companion.variablesSerializer,
    ),
    DeleteGroceryItemMutation

private class DeletePaymentMethodMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        DeletePaymentMethodMutation.Data,
        DeletePaymentMethodMutation.Variables,
    >(
        connector,
        DeletePaymentMethodMutation.Companion.operationName,
        DeletePaymentMethodMutation.Companion.dataDeserializer,
        DeletePaymentMethodMutation.Companion.variablesSerializer,
    ),
    DeletePaymentMethodMutation

private class GetCreativeTemplatesQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetCreativeTemplatesQuery.Data,
        Unit,
    >(
        connector,
        GetCreativeTemplatesQuery.Companion.operationName,
        GetCreativeTemplatesQuery.Companion.dataDeserializer,
        GetCreativeTemplatesQuery.Companion.variablesSerializer,
    ),
    GetCreativeTemplatesQuery

private class GetCreatorAgentsQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetCreatorAgentsQuery.Data,
        Unit,
    >(
        connector,
        GetCreatorAgentsQuery.Companion.operationName,
        GetCreatorAgentsQuery.Companion.dataDeserializer,
        GetCreatorAgentsQuery.Companion.variablesSerializer,
    ),
    GetCreatorAgentsQuery

private class GetGroceryListQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetGroceryListQuery.Data,
        GetGroceryListQuery.Variables,
    >(
        connector,
        GetGroceryListQuery.Companion.operationName,
        GetGroceryListQuery.Companion.dataDeserializer,
        GetGroceryListQuery.Companion.variablesSerializer,
    ),
    GetGroceryListQuery

private class GetItineraryEventsQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetItineraryEventsQuery.Data,
        Unit,
    >(
        connector,
        GetItineraryEventsQuery.Companion.operationName,
        GetItineraryEventsQuery.Companion.dataDeserializer,
        GetItineraryEventsQuery.Companion.variablesSerializer,
    ),
    GetItineraryEventsQuery

private class GetOnboardingStatusQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetOnboardingStatusQuery.Data,
        Unit,
    >(
        connector,
        GetOnboardingStatusQuery.Companion.operationName,
        GetOnboardingStatusQuery.Companion.dataDeserializer,
        GetOnboardingStatusQuery.Companion.variablesSerializer,
    ),
    GetOnboardingStatusQuery

private class GetPaymentMethodsQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetPaymentMethodsQuery.Data,
        Unit,
    >(
        connector,
        GetPaymentMethodsQuery.Companion.operationName,
        GetPaymentMethodsQuery.Companion.dataDeserializer,
        GetPaymentMethodsQuery.Companion.variablesSerializer,
    ),
    GetPaymentMethodsQuery

private class GetProductByIdQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetProductByIdQuery.Data,
        GetProductByIdQuery.Variables,
    >(
        connector,
        GetProductByIdQuery.Companion.operationName,
        GetProductByIdQuery.Companion.dataDeserializer,
        GetProductByIdQuery.Companion.variablesSerializer,
    ),
    GetProductByIdQuery

private class GetTravelExpensesQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetTravelExpensesQuery.Data,
        Unit,
    >(
        connector,
        GetTravelExpensesQuery.Companion.operationName,
        GetTravelExpensesQuery.Companion.dataDeserializer,
        GetTravelExpensesQuery.Companion.variablesSerializer,
    ),
    GetTravelExpensesQuery

private class GetTripsQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetTripsQuery.Data,
        Unit,
    >(
        connector,
        GetTripsQuery.Companion.operationName,
        GetTripsQuery.Companion.dataDeserializer,
        GetTripsQuery.Companion.variablesSerializer,
    ),
    GetTripsQuery

private class GetUserCartQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetUserCartQuery.Data,
        Unit,
    >(
        connector,
        GetUserCartQuery.Companion.operationName,
        GetUserCartQuery.Companion.dataDeserializer,
        GetUserCartQuery.Companion.variablesSerializer,
    ),
    GetUserCartQuery

private class GetUserOrdersQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetUserOrdersQuery.Data,
        Unit,
    >(
        connector,
        GetUserOrdersQuery.Companion.operationName,
        GetUserOrdersQuery.Companion.dataDeserializer,
        GetUserOrdersQuery.Companion.variablesSerializer,
    ),
    GetUserOrdersQuery

private class GetUserPreferenceQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetUserPreferenceQuery.Data,
        Unit,
    >(
        connector,
        GetUserPreferenceQuery.Companion.operationName,
        GetUserPreferenceQuery.Companion.dataDeserializer,
        GetUserPreferenceQuery.Companion.variablesSerializer,
    ),
    GetUserPreferenceQuery

private class GetUserPreferencesQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetUserPreferencesQuery.Data,
        Unit,
    >(
        connector,
        GetUserPreferencesQuery.Companion.operationName,
        GetUserPreferencesQuery.Companion.dataDeserializer,
        GetUserPreferencesQuery.Companion.variablesSerializer,
    ),
    GetUserPreferencesQuery

private class GetUserProfileQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetUserProfileQuery.Data,
        Unit,
    >(
        connector,
        GetUserProfileQuery.Companion.operationName,
        GetUserProfileQuery.Companion.dataDeserializer,
        GetUserProfileQuery.Companion.variablesSerializer,
    ),
    GetUserProfileQuery

private class GetUserSubscriptionQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetUserSubscriptionQuery.Data,
        Unit,
    >(
        connector,
        GetUserSubscriptionQuery.Companion.operationName,
        GetUserSubscriptionQuery.Companion.dataDeserializer,
        GetUserSubscriptionQuery.Companion.variablesSerializer,
    ),
    GetUserSubscriptionQuery

private class GetUserVideosQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetUserVideosQuery.Data,
        Unit,
    >(
        connector,
        GetUserVideosQuery.Companion.operationName,
        GetUserVideosQuery.Companion.dataDeserializer,
        GetUserVideosQuery.Companion.variablesSerializer,
    ),
    GetUserVideosQuery

private class GetVisionHistoryQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetVisionHistoryQuery.Data,
        Unit,
    >(
        connector,
        GetVisionHistoryQuery.Companion.operationName,
        GetVisionHistoryQuery.Companion.dataDeserializer,
        GetVisionHistoryQuery.Companion.variablesSerializer,
    ),
    GetVisionHistoryQuery

private class GetVoiceNotesQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetVoiceNotesQuery.Data,
        Unit,
    >(
        connector,
        GetVoiceNotesQuery.Companion.operationName,
        GetVoiceNotesQuery.Companion.dataDeserializer,
        GetVoiceNotesQuery.Companion.variablesSerializer,
    ),
    GetVoiceNotesQuery

private class GetWardrobeItemsQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetWardrobeItemsQuery.Data,
        Unit,
    >(
        connector,
        GetWardrobeItemsQuery.Companion.operationName,
        GetWardrobeItemsQuery.Companion.dataDeserializer,
        GetWardrobeItemsQuery.Companion.variablesSerializer,
    ),
    GetWardrobeItemsQuery

private class GetWardrobeOutfitsQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        GetWardrobeOutfitsQuery.Data,
        Unit,
    >(
        connector,
        GetWardrobeOutfitsQuery.Companion.operationName,
        GetWardrobeOutfitsQuery.Companion.dataDeserializer,
        GetWardrobeOutfitsQuery.Companion.variablesSerializer,
    ),
    GetWardrobeOutfitsQuery

private class ListProductsQueryImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedQueryImpl<
        ListProductsQuery.Data,
        Unit,
    >(
        connector,
        ListProductsQuery.Companion.operationName,
        ListProductsQuery.Companion.dataDeserializer,
        ListProductsQuery.Companion.variablesSerializer,
    ),
    ListProductsQuery

private class LogVisionEventMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        LogVisionEventMutation.Data,
        LogVisionEventMutation.Variables,
    >(
        connector,
        LogVisionEventMutation.Companion.operationName,
        LogVisionEventMutation.Companion.dataDeserializer,
        LogVisionEventMutation.Companion.variablesSerializer,
    ),
    LogVisionEventMutation

private class ToggleGroceryItemMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        ToggleGroceryItemMutation.Data,
        ToggleGroceryItemMutation.Variables,
    >(
        connector,
        ToggleGroceryItemMutation.Companion.operationName,
        ToggleGroceryItemMutation.Companion.dataDeserializer,
        ToggleGroceryItemMutation.Companion.variablesSerializer,
    ),
    ToggleGroceryItemMutation

private class ToggleLikeMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        ToggleLikeMutation.Data,
        ToggleLikeMutation.Variables,
    >(
        connector,
        ToggleLikeMutation.Companion.operationName,
        ToggleLikeMutation.Companion.dataDeserializer,
        ToggleLikeMutation.Companion.variablesSerializer,
    ),
    ToggleLikeMutation

private class UpdateOnboardingStatusMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        UpdateOnboardingStatusMutation.Data,
        UpdateOnboardingStatusMutation.Variables,
    >(
        connector,
        UpdateOnboardingStatusMutation.Companion.operationName,
        UpdateOnboardingStatusMutation.Companion.dataDeserializer,
        UpdateOnboardingStatusMutation.Companion.variablesSerializer,
    ),
    UpdateOnboardingStatusMutation

private class UpsertUserPreferenceMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        UpsertUserPreferenceMutation.Data,
        UpsertUserPreferenceMutation.Variables,
    >(
        connector,
        UpsertUserPreferenceMutation.Companion.operationName,
        UpsertUserPreferenceMutation.Companion.dataDeserializer,
        UpsertUserPreferenceMutation.Companion.variablesSerializer,
    ),
    UpsertUserPreferenceMutation

private class UpsertUserProfileMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        UpsertUserProfileMutation.Data,
        UpsertUserProfileMutation.Variables,
    >(
        connector,
        UpsertUserProfileMutation.Companion.operationName,
        UpsertUserProfileMutation.Companion.dataDeserializer,
        UpsertUserProfileMutation.Companion.variablesSerializer,
    ),
    UpsertUserProfileMutation

private class UpsertUserSubscriptionMutationImpl(
    connector: SpressoConnectorConnector,
) : SpressoConnectorConnectorGeneratedMutationImpl<
        UpsertUserSubscriptionMutation.Data,
        UpsertUserSubscriptionMutation.Variables,
    >(
        connector,
        UpsertUserSubscriptionMutation.Companion.operationName,
        UpsertUserSubscriptionMutation.Companion.dataDeserializer,
        UpsertUserSubscriptionMutation.Companion.variablesSerializer,
    ),
    UpsertUserSubscriptionMutation
