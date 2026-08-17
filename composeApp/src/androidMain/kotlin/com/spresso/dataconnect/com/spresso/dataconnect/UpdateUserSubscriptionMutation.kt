
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



public interface UpdateUserSubscriptionMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      SpressoConnectorConnector,
      UpdateUserSubscriptionMutation.Data,
      UpdateUserSubscriptionMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
    val tier: String,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val userSubscription_update: UserSubscriptionKey?,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "UpdateUserSubscription"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun UpdateUserSubscriptionMutation.ref(
  
    id: java.util.UUID,tier: String,

  
  
): com.google.firebase.dataconnect.MutationRef<
    UpdateUserSubscriptionMutation.Data,
    UpdateUserSubscriptionMutation.Variables
  > =
  ref(
    
      UpdateUserSubscriptionMutation.Variables(
        id=id,tier=tier,
  
      )
    
  )

public suspend fun UpdateUserSubscriptionMutation.execute(

  
    
      id: java.util.UUID,tier: String,

  

  ): com.google.firebase.dataconnect.MutationResult<
    UpdateUserSubscriptionMutation.Data,
    UpdateUserSubscriptionMutation.Variables
  > =
  ref(
    
      id=id,tier=tier,
  
    
  ).execute()


