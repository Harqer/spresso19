
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


public interface GetVisionHistoryQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
      SpressoConnectorConnector,
      GetVisionHistoryQuery.Data,
      Unit
    >
{
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val visionHistories: List<VisionHistoriesItem>,
  
  ) {
    
      
        @kotlinx.serialization.Serializable
  public data class VisionHistoriesItem(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
    val detectedObjects: String,
  
    val context: String?,
  
    val imageUrl: String?,
  
    val createdAt: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.TimestampSerializer::class) com.google.firebase.Timestamp,
  
  ) {
    
    
  }
      
    
    
  }
  

  public companion object {
    public val operationName: String = "GetVisionHistory"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
      kotlinx.serialization.serializer()
  }
}

public fun GetVisionHistoryQuery.ref(
  
): com.google.firebase.dataconnect.QueryRef<
    GetVisionHistoryQuery.Data,
    Unit
  > =
  ref(
    
      Unit
    
  )

public suspend fun GetVisionHistoryQuery.execute(

  

  ): com.google.firebase.dataconnect.QueryResult<
    GetVisionHistoryQuery.Data,
    Unit
  > =
  ref(
    
  ).execute()


  public fun GetVisionHistoryQuery.flow(
    
    ): kotlinx.coroutines.flow.Flow<GetVisionHistoryQuery.Data> =
    ref(
        
      ).subscribe()
      .flow
      ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
      ._flow_filterNotNull()
      ._flow_map { it.data }

