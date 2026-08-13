
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
import kotlin.time.Duration.Companion.milliseconds as _milliseconds

public interface SpressoConnectorConnector : com.google.firebase.dataconnect.generated.GeneratedConnector<SpressoConnectorConnector> {
  override val dataConnect: com.google.firebase.dataconnect.FirebaseDataConnect

  
    public val addVideo: AddVideoMutation
  
    public val createOrder: CreateOrderMutation
  
    public val getProductById: GetProductByIdQuery
  
    public val getUserCart: GetUserCartQuery
  
    public val getUserOrders: GetUserOrdersQuery
  
    public val getUserProfile: GetUserProfileQuery
  
    public val getUserVideos: GetUserVideosQuery
  
    public val listProducts: ListProductsQuery
  
    public val toggleLike: ToggleLikeMutation
  
    public val upsertUserProfile: UpsertUserProfileMutation
  

  public companion object {
    @Suppress("MemberVisibilityCanBePrivate")
    public val config: com.google.firebase.dataconnect.ConnectorConfig = com.google.firebase.dataconnect.ConnectorConfig(
      connector = "spresso-connector",
      location = "us-central1",
      serviceId = "spresso-dataconnect",
    )

    public fun getInstance(
      dataConnect: com.google.firebase.dataconnect.FirebaseDataConnect
    ):SpressoConnectorConnector = synchronized(instances) {
      instances.getOrPut(dataConnect) {
        SpressoConnectorConnectorImpl(dataConnect)
      }
    }

    private val instances = java.util.WeakHashMap<com.google.firebase.dataconnect.FirebaseDataConnect, SpressoConnectorConnectorImpl>()

    
  }
}

public val SpressoConnectorConnector.Companion.instance:SpressoConnectorConnector
  get() = getInstance(com.google.firebase.dataconnect.FirebaseDataConnect._fdcGetInstance(
    config
  ))

public fun SpressoConnectorConnector.Companion.getInstance(
  settings: com.google.firebase.dataconnect.DataConnectSettings = com.google.firebase.dataconnect.DataConnectSettings()
):SpressoConnectorConnector =
  getInstance(com.google.firebase.dataconnect.FirebaseDataConnect._fdcGetInstance(config, settings))

public fun SpressoConnectorConnector.Companion.getInstance(
  app: com.google.firebase.FirebaseApp,
  settings: com.google.firebase.dataconnect.DataConnectSettings = com.google.firebase.dataconnect.DataConnectSettings()
):SpressoConnectorConnector =
  getInstance(com.google.firebase.dataconnect.FirebaseDataConnect._fdcGetInstance(app, config, settings))

private class SpressoConnectorConnectorImpl(
  override val dataConnect: com.google.firebase.dataconnect.FirebaseDataConnect
) : SpressoConnectorConnector {
  
    override val addVideo by lazy(LazyThreadSafetyMode.PUBLICATION) {
      AddVideoMutationImpl(this)
    }
  
    override val createOrder by lazy(LazyThreadSafetyMode.PUBLICATION) {
      CreateOrderMutationImpl(this)
    }
  
    override val getProductById by lazy(LazyThreadSafetyMode.PUBLICATION) {
      GetProductByIdQueryImpl(this)
    }
  
    override val getUserCart by lazy(LazyThreadSafetyMode.PUBLICATION) {
      GetUserCartQueryImpl(this)
    }
  
    override val getUserOrders by lazy(LazyThreadSafetyMode.PUBLICATION) {
      GetUserOrdersQueryImpl(this)
    }
  
    override val getUserProfile by lazy(LazyThreadSafetyMode.PUBLICATION) {
      GetUserProfileQueryImpl(this)
    }
  
    override val getUserVideos by lazy(LazyThreadSafetyMode.PUBLICATION) {
      GetUserVideosQueryImpl(this)
    }
  
    override val listProducts by lazy(LazyThreadSafetyMode.PUBLICATION) {
      ListProductsQueryImpl(this)
    }
  
    override val toggleLike by lazy(LazyThreadSafetyMode.PUBLICATION) {
      ToggleLikeMutationImpl(this)
    }
  
    override val upsertUserProfile by lazy(LazyThreadSafetyMode.PUBLICATION) {
      UpsertUserProfileMutationImpl(this)
    }
  

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun operations(): List<com.google.firebase.dataconnect.generated.GeneratedOperation<SpressoConnectorConnector, *, *>> =
    queries() + mutations()

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun mutations(): List<com.google.firebase.dataconnect.generated.GeneratedMutation<SpressoConnectorConnector, *, *>> =
    listOf(
      addVideo,
        createOrder,
        toggleLike,
        upsertUserProfile,
        
    )

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun queries(): List<com.google.firebase.dataconnect.generated.GeneratedQuery<SpressoConnectorConnector, *, *>> =
    listOf(
      getProductById,
        getUserCart,
        getUserOrders,
        getUserProfile,
        getUserVideos,
        listProducts,
        
    )

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun copy(dataConnect: com.google.firebase.dataconnect.FirebaseDataConnect) =
    SpressoConnectorConnectorImpl(dataConnect)

  override fun equals(other: Any?): Boolean =
    other is SpressoConnectorConnectorImpl &&
    other.dataConnect == dataConnect

  override fun hashCode(): Int =
    java.util.Objects.hash(
      "SpressoConnectorConnectorImpl",
      dataConnect,
    )

  override fun toString(): String =
    "SpressoConnectorConnectorImpl(dataConnect=$dataConnect)"
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
  ) =
    SpressoConnectorConnectorGeneratedQueryImpl(
      connector, operationName, dataDeserializer, variablesSerializer
    )

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun <NewVariables> withVariablesSerializer(
    variablesSerializer: kotlinx.serialization.SerializationStrategy<NewVariables>
  ) =
    SpressoConnectorConnectorGeneratedQueryImpl(
      connector, operationName, dataDeserializer, variablesSerializer
    )

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun <NewData> withDataDeserializer(
    dataDeserializer: kotlinx.serialization.DeserializationStrategy<NewData>
  ) =
    SpressoConnectorConnectorGeneratedQueryImpl(
      connector, operationName, dataDeserializer, variablesSerializer
    )

  override fun equals(other: Any?): Boolean =
    other is SpressoConnectorConnectorGeneratedQueryImpl<*,*> &&
    other.connector == connector &&
    other.operationName == operationName &&
    other.dataDeserializer == dataDeserializer &&
    other.variablesSerializer == variablesSerializer

  override fun hashCode(): Int =
    java.util.Objects.hash(
      "SpressoConnectorConnectorGeneratedQueryImpl",
      connector, operationName, dataDeserializer, variablesSerializer
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
  ) =
    SpressoConnectorConnectorGeneratedMutationImpl(
      connector, operationName, dataDeserializer, variablesSerializer
    )

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun <NewVariables> withVariablesSerializer(
    variablesSerializer: kotlinx.serialization.SerializationStrategy<NewVariables>
  ) =
    SpressoConnectorConnectorGeneratedMutationImpl(
      connector, operationName, dataDeserializer, variablesSerializer
    )

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun <NewData> withDataDeserializer(
    dataDeserializer: kotlinx.serialization.DeserializationStrategy<NewData>
  ) =
    SpressoConnectorConnectorGeneratedMutationImpl(
      connector, operationName, dataDeserializer, variablesSerializer
    )

  override fun equals(other: Any?): Boolean =
    other is SpressoConnectorConnectorGeneratedMutationImpl<*,*> &&
    other.connector == connector &&
    other.operationName == operationName &&
    other.dataDeserializer == dataDeserializer &&
    other.variablesSerializer == variablesSerializer

  override fun hashCode(): Int =
    java.util.Objects.hash(
      "SpressoConnectorConnectorGeneratedMutationImpl",
      connector, operationName, dataDeserializer, variablesSerializer
    )

  override fun toString(): String =
    "SpressoConnectorConnectorGeneratedMutationImpl(" +
    "operationName=$operationName, " +
    "dataDeserializer=$dataDeserializer, " +
    "variablesSerializer=$variablesSerializer, " +
    "connector=$connector)"
}



private class AddVideoMutationImpl(
  connector: SpressoConnectorConnector
):
  AddVideoMutation,
  SpressoConnectorConnectorGeneratedMutationImpl<
      AddVideoMutation.Data,
      AddVideoMutation.Variables
  >(
    connector,
    AddVideoMutation.Companion.operationName,
    AddVideoMutation.Companion.dataDeserializer,
    AddVideoMutation.Companion.variablesSerializer,
  )


private class CreateOrderMutationImpl(
  connector: SpressoConnectorConnector
):
  CreateOrderMutation,
  SpressoConnectorConnectorGeneratedMutationImpl<
      CreateOrderMutation.Data,
      CreateOrderMutation.Variables
  >(
    connector,
    CreateOrderMutation.Companion.operationName,
    CreateOrderMutation.Companion.dataDeserializer,
    CreateOrderMutation.Companion.variablesSerializer,
  )


private class GetProductByIdQueryImpl(
  connector: SpressoConnectorConnector
):
  GetProductByIdQuery,
  SpressoConnectorConnectorGeneratedQueryImpl<
      GetProductByIdQuery.Data,
      GetProductByIdQuery.Variables
  >(
    connector,
    GetProductByIdQuery.Companion.operationName,
    GetProductByIdQuery.Companion.dataDeserializer,
    GetProductByIdQuery.Companion.variablesSerializer,
  )


private class GetUserCartQueryImpl(
  connector: SpressoConnectorConnector
):
  GetUserCartQuery,
  SpressoConnectorConnectorGeneratedQueryImpl<
      GetUserCartQuery.Data,
      Unit
  >(
    connector,
    GetUserCartQuery.Companion.operationName,
    GetUserCartQuery.Companion.dataDeserializer,
    GetUserCartQuery.Companion.variablesSerializer,
  )


private class GetUserOrdersQueryImpl(
  connector: SpressoConnectorConnector
):
  GetUserOrdersQuery,
  SpressoConnectorConnectorGeneratedQueryImpl<
      GetUserOrdersQuery.Data,
      Unit
  >(
    connector,
    GetUserOrdersQuery.Companion.operationName,
    GetUserOrdersQuery.Companion.dataDeserializer,
    GetUserOrdersQuery.Companion.variablesSerializer,
  )


private class GetUserProfileQueryImpl(
  connector: SpressoConnectorConnector
):
  GetUserProfileQuery,
  SpressoConnectorConnectorGeneratedQueryImpl<
      GetUserProfileQuery.Data,
      Unit
  >(
    connector,
    GetUserProfileQuery.Companion.operationName,
    GetUserProfileQuery.Companion.dataDeserializer,
    GetUserProfileQuery.Companion.variablesSerializer,
  )


private class GetUserVideosQueryImpl(
  connector: SpressoConnectorConnector
):
  GetUserVideosQuery,
  SpressoConnectorConnectorGeneratedQueryImpl<
      GetUserVideosQuery.Data,
      Unit
  >(
    connector,
    GetUserVideosQuery.Companion.operationName,
    GetUserVideosQuery.Companion.dataDeserializer,
    GetUserVideosQuery.Companion.variablesSerializer,
  )


private class ListProductsQueryImpl(
  connector: SpressoConnectorConnector
):
  ListProductsQuery,
  SpressoConnectorConnectorGeneratedQueryImpl<
      ListProductsQuery.Data,
      Unit
  >(
    connector,
    ListProductsQuery.Companion.operationName,
    ListProductsQuery.Companion.dataDeserializer,
    ListProductsQuery.Companion.variablesSerializer,
  )


private class ToggleLikeMutationImpl(
  connector: SpressoConnectorConnector
):
  ToggleLikeMutation,
  SpressoConnectorConnectorGeneratedMutationImpl<
      ToggleLikeMutation.Data,
      ToggleLikeMutation.Variables
  >(
    connector,
    ToggleLikeMutation.Companion.operationName,
    ToggleLikeMutation.Companion.dataDeserializer,
    ToggleLikeMutation.Companion.variablesSerializer,
  )


private class UpsertUserProfileMutationImpl(
  connector: SpressoConnectorConnector
):
  UpsertUserProfileMutation,
  SpressoConnectorConnectorGeneratedMutationImpl<
      UpsertUserProfileMutation.Data,
      UpsertUserProfileMutation.Variables
  >(
    connector,
    UpsertUserProfileMutation.Companion.operationName,
    UpsertUserProfileMutation.Companion.dataDeserializer,
    UpsertUserProfileMutation.Companion.variablesSerializer,
  )


