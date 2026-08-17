
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


import kotlinx.coroutines.flow.filterNotNull as _flow_filterNotNull
import kotlinx.coroutines.flow.map as _flow_map


public interface GetTripsQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
      SpressoConnectorConnector,
      GetTripsQuery.Data,
      Unit
    >
{
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val trips: List<TripsItem>,
  
  ) {
    
      
        @kotlinx.serialization.Serializable
  public data class TripsItem(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
    val title: String,
  
    val destination: String?,
  
    val startDate: String?,
  
    val endDate: String?,
  
    val status: String?,
  
    val coverImage: String?,
  
  ) {
    
    
  }
      
    
    
  }
  

  public companion object {
    public val operationName: String = "GetTrips"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
      kotlinx.serialization.serializer()
  }
}

public fun GetTripsQuery.ref(
  
): com.google.firebase.dataconnect.QueryRef<
    GetTripsQuery.Data,
    Unit
  > =
  ref(
    
      Unit
    
  )

public suspend fun GetTripsQuery.execute(

  

  ): com.google.firebase.dataconnect.QueryResult<
    GetTripsQuery.Data,
    Unit
  > =
  ref(
    
  ).execute()


  public fun GetTripsQuery.flow(
    
    ): kotlinx.coroutines.flow.Flow<GetTripsQuery.Data> =
    ref(
        
      ).subscribe()
      .flow
      ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
      ._flow_filterNotNull()
      ._flow_map { it.data }

