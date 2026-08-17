
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


public interface GetTravelExpensesQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
      SpressoConnectorConnector,
      GetTravelExpensesQuery.Data,
      Unit
    >
{
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val travelExpenses: List<TravelExpensesItem>,
  
  ) {
    
      
        @kotlinx.serialization.Serializable
  public data class TravelExpensesItem(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
    val tripId: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
    val amount: Double,
  
    val currency: String?,
  
    val category: String,
  
    val merchant: String,
  
    val receiptImageUrl: String?,
  
    val date: String?,
  
    val items: String?,
  
  ) {
    
    
  }
      
    
    
  }
  

  public companion object {
    public val operationName: String = "GetTravelExpenses"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
      kotlinx.serialization.serializer()
  }
}

public fun GetTravelExpensesQuery.ref(
  
): com.google.firebase.dataconnect.QueryRef<
    GetTravelExpensesQuery.Data,
    Unit
  > =
  ref(
    
      Unit
    
  )

public suspend fun GetTravelExpensesQuery.execute(

  

  ): com.google.firebase.dataconnect.QueryResult<
    GetTravelExpensesQuery.Data,
    Unit
  > =
  ref(
    
  ).execute()


  public fun GetTravelExpensesQuery.flow(
    
    ): kotlinx.coroutines.flow.Flow<GetTravelExpensesQuery.Data> =
    ref(
        
      ).subscribe()
      .flow
      ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
      ._flow_filterNotNull()
      ._flow_map { it.data }

