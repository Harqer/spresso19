
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


public interface GetOnboardingStatusQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
      SpressoConnectorConnector,
      GetOnboardingStatusQuery.Data,
      Unit
    >
{
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val onboardingStatuses: List<OnboardingStatusesItem>,
  
  ) {
    
      
        @kotlinx.serialization.Serializable
  public data class OnboardingStatusesItem(
  
    val userId: String,
  
    val currentStep: Int,
  
    val isCompleted: Boolean,
  
    val updatedAt: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.TimestampSerializer::class) com.google.firebase.Timestamp,
  
  ) {
    
    
  }
      
    
    
  }
  

  public companion object {
    public val operationName: String = "GetOnboardingStatus"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
      kotlinx.serialization.serializer()
  }
}

public fun GetOnboardingStatusQuery.ref(
  
): com.google.firebase.dataconnect.QueryRef<
    GetOnboardingStatusQuery.Data,
    Unit
  > =
  ref(
    
      Unit
    
  )

public suspend fun GetOnboardingStatusQuery.execute(

  

  ): com.google.firebase.dataconnect.QueryResult<
    GetOnboardingStatusQuery.Data,
    Unit
  > =
  ref(
    
  ).execute()


  public fun GetOnboardingStatusQuery.flow(
    
    ): kotlinx.coroutines.flow.Flow<GetOnboardingStatusQuery.Data> =
    ref(
        
      ).subscribe()
      .flow
      ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
      ._flow_filterNotNull()
      ._flow_map { it.data }

