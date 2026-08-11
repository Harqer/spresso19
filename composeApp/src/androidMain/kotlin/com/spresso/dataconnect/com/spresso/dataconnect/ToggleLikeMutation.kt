
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



public interface ToggleLikeMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      SpressoConnectorConnector,
      ToggleLikeMutation.Data,
      ToggleLikeMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val productId: String,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val userLike_upsert: UserLikeKey,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "ToggleLike"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun ToggleLikeMutation.ref(
  
    productId: String,

  
  
): com.google.firebase.dataconnect.MutationRef<
    ToggleLikeMutation.Data,
    ToggleLikeMutation.Variables
  > =
  ref(
    
      ToggleLikeMutation.Variables(
        productId=productId,
  
      )
    
  )

public suspend fun ToggleLikeMutation.execute(

  
    
      productId: String,

  

  ): com.google.firebase.dataconnect.MutationResult<
    ToggleLikeMutation.Data,
    ToggleLikeMutation.Variables
  > =
  ref(
    
      productId=productId,
  
    
  ).execute()


