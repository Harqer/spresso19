
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



public interface CreatePaymentMethodMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      SpressoConnectorConnector,
      CreatePaymentMethodMutation.Data,
      CreatePaymentMethodMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val stripePaymentMethodId: String,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val paymentMethod_insert: PaymentMethodKey,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "CreatePaymentMethod"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun CreatePaymentMethodMutation.ref(
  
    stripePaymentMethodId: String,

  
  
): com.google.firebase.dataconnect.MutationRef<
    CreatePaymentMethodMutation.Data,
    CreatePaymentMethodMutation.Variables
  > =
  ref(
    
      CreatePaymentMethodMutation.Variables(
        stripePaymentMethodId=stripePaymentMethodId,
  
      )
    
  )

public suspend fun CreatePaymentMethodMutation.execute(

  
    
      stripePaymentMethodId: String,

  

  ): com.google.firebase.dataconnect.MutationResult<
    CreatePaymentMethodMutation.Data,
    CreatePaymentMethodMutation.Variables
  > =
  ref(
    
      stripePaymentMethodId=stripePaymentMethodId,
  
    
  ).execute()


