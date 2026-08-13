
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
  
    val totalAmount: Double,
  
    val shippingAddress: com.google.firebase.dataconnect.OptionalVariable<String?>,
  
    val deviceSource: String,
  
    val paymentMethod: String,
  
    val userConfirmedToken: com.google.firebase.dataconnect.OptionalVariable<String?>,
  
  ) {
    
    
      
      @kotlin.DslMarker public annotation class BuilderDsl

      
      @BuilderDsl
      public interface Builder {
        public var authorizationId: String
        public var productId: String
        public var quantity: Int
        public var totalAmount: Double
        public var shippingAddress: String?
        public var deviceSource: String
        public var paymentMethod: String
        public var userConfirmedToken: String?
        
      }

      public companion object {
        
        @Suppress("NAME_SHADOWING")
        public fun build(
          authorizationId: String,productId: String,quantity: Int,totalAmount: Double,deviceSource: String,paymentMethod: String,
          block_: Builder.() -> Unit
        ): Variables {
          var authorizationId= authorizationId
            var productId= productId
            var quantity= quantity
            var totalAmount= totalAmount
            var shippingAddress: com.google.firebase.dataconnect.OptionalVariable<String?> =
                com.google.firebase.dataconnect.OptionalVariable.Undefined
            var deviceSource= deviceSource
            var paymentMethod= paymentMethod
            var userConfirmedToken: com.google.firebase.dataconnect.OptionalVariable<String?> =
                com.google.firebase.dataconnect.OptionalVariable.Undefined
            

          return object : Builder {
            override var authorizationId: String
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { authorizationId = value_ }
              
            override var productId: String
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { productId = value_ }
              
            override var quantity: Int
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { quantity = value_ }
              
            override var totalAmount: Double
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { totalAmount = value_ }
              
            override var shippingAddress: String?
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { shippingAddress = com.google.firebase.dataconnect.OptionalVariable.Value(value_) }
              
            override var deviceSource: String
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { deviceSource = value_ }
              
            override var paymentMethod: String
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { paymentMethod = value_ }
              
            override var userConfirmedToken: String?
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { userConfirmedToken = com.google.firebase.dataconnect.OptionalVariable.Value(value_) }
              
            
          }.apply(block_)
          .let {
            Variables(
              authorizationId=authorizationId,productId=productId,quantity=quantity,totalAmount=totalAmount,shippingAddress=shippingAddress,deviceSource=deviceSource,paymentMethod=paymentMethod,userConfirmedToken=userConfirmedToken,
            )
          }
        }
      }
    
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
  
    authorizationId: String,productId: String,quantity: Int,totalAmount: Double,deviceSource: String,paymentMethod: String,

  
    block_: CreateOrderMutation.Variables.Builder.() -> Unit = {}
  
): com.google.firebase.dataconnect.MutationRef<
    CreateOrderMutation.Data,
    CreateOrderMutation.Variables
  > =
  ref(
    
      CreateOrderMutation.Variables.build(
        authorizationId=authorizationId,productId=productId,quantity=quantity,totalAmount=totalAmount,deviceSource=deviceSource,paymentMethod=paymentMethod,
  
    block_
      )
    
  )

public suspend fun CreateOrderMutation.execute(

  
    
      authorizationId: String,productId: String,quantity: Int,totalAmount: Double,deviceSource: String,paymentMethod: String,

  
    block_: CreateOrderMutation.Variables.Builder.() -> Unit = {}

  ): com.google.firebase.dataconnect.MutationResult<
    CreateOrderMutation.Data,
    CreateOrderMutation.Variables
  > =
  ref(
    
      authorizationId=authorizationId,productId=productId,quantity=quantity,totalAmount=totalAmount,deviceSource=deviceSource,paymentMethod=paymentMethod,
  
    block_
    
  ).execute()


