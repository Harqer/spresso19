
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



public interface CreateOrderMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      SpressoConnectorConnector,
      CreateOrderMutation.Data,
      CreateOrderMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val authorizationId: String,
  
    val productId: String,
  
    val quantity: Int,
  
    val deviceSource: String,
  
    val paymentMethod: String,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val order_insert: OrderKey,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "CreateOrder"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun CreateOrderMutation.ref(
  
    authorizationId: String,productId: String,quantity: Int,deviceSource: String,paymentMethod: String,

  
  
): com.google.firebase.dataconnect.MutationRef<
    CreateOrderMutation.Data,
    CreateOrderMutation.Variables
  > =
  ref(
    
      CreateOrderMutation.Variables(
        authorizationId=authorizationId,productId=productId,quantity=quantity,deviceSource=deviceSource,paymentMethod=paymentMethod,
  
      )
    
  )

public suspend fun CreateOrderMutation.execute(

  
    
      authorizationId: String,productId: String,quantity: Int,deviceSource: String,paymentMethod: String,

  

  ): com.google.firebase.dataconnect.MutationResult<
    CreateOrderMutation.Data,
    CreateOrderMutation.Variables
  > =
  ref(
    
      authorizationId=authorizationId,productId=productId,quantity=quantity,deviceSource=deviceSource,paymentMethod=paymentMethod,
  
    
  ).execute()


