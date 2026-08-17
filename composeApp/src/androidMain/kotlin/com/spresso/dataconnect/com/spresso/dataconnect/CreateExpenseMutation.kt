
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



public interface CreateExpenseMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      SpressoConnectorConnector,
      CreateExpenseMutation.Data,
      CreateExpenseMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val tripId: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
    val amount: Double,
  
    val currency: com.google.firebase.dataconnect.OptionalVariable<String?>,
  
    val category: String,
  
    val merchant: String,
  
    val receiptImageUrl: com.google.firebase.dataconnect.OptionalVariable<String?>,
  
    val date: com.google.firebase.dataconnect.OptionalVariable<String?>,
  
    val items: com.google.firebase.dataconnect.OptionalVariable<String?>,
  
  ) {
    
    
      
      @kotlin.DslMarker public annotation class BuilderDsl

      
      @BuilderDsl
      public interface Builder {
        public var tripId: java.util.UUID
        public var amount: Double
        public var currency: String?
        public var category: String
        public var merchant: String
        public var receiptImageUrl: String?
        public var date: String?
        public var items: String?
        
      }

      public companion object {
        
        @Suppress("NAME_SHADOWING")
        public fun build(
          tripId: java.util.UUID,amount: Double,category: String,merchant: String,
          block_: Builder.() -> Unit
        ): Variables {
          var tripId= tripId
            var amount= amount
            var currency: com.google.firebase.dataconnect.OptionalVariable<String?> =
                com.google.firebase.dataconnect.OptionalVariable.Undefined
            var category= category
            var merchant= merchant
            var receiptImageUrl: com.google.firebase.dataconnect.OptionalVariable<String?> =
                com.google.firebase.dataconnect.OptionalVariable.Undefined
            var date: com.google.firebase.dataconnect.OptionalVariable<String?> =
                com.google.firebase.dataconnect.OptionalVariable.Undefined
            var items: com.google.firebase.dataconnect.OptionalVariable<String?> =
                com.google.firebase.dataconnect.OptionalVariable.Undefined
            

          return object : Builder {
            override var tripId: java.util.UUID
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { tripId = value_ }
              
            override var amount: Double
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { amount = value_ }
              
            override var currency: String?
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { currency = com.google.firebase.dataconnect.OptionalVariable.Value(value_) }
              
            override var category: String
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { category = value_ }
              
            override var merchant: String
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { merchant = value_ }
              
            override var receiptImageUrl: String?
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { receiptImageUrl = com.google.firebase.dataconnect.OptionalVariable.Value(value_) }
              
            override var date: String?
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { date = com.google.firebase.dataconnect.OptionalVariable.Value(value_) }
              
            override var items: String?
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { items = com.google.firebase.dataconnect.OptionalVariable.Value(value_) }
              
            
          }.apply(block_)
          .let {
            Variables(
              tripId=tripId,amount=amount,currency=currency,category=category,merchant=merchant,receiptImageUrl=receiptImageUrl,date=date,items=items,
            )
          }
        }
      }
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val travelExpense_insert: TravelExpenseKey,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "CreateExpense"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun CreateExpenseMutation.ref(
  
    tripId: java.util.UUID,amount: Double,category: String,merchant: String,

  
    block_: CreateExpenseMutation.Variables.Builder.() -> Unit = {}
  
): com.google.firebase.dataconnect.MutationRef<
    CreateExpenseMutation.Data,
    CreateExpenseMutation.Variables
  > =
  ref(
    
      CreateExpenseMutation.Variables.build(
        tripId=tripId,amount=amount,category=category,merchant=merchant,
  
    block_
      )
    
  )

public suspend fun CreateExpenseMutation.execute(

  
    
      tripId: java.util.UUID,amount: Double,category: String,merchant: String,

  
    block_: CreateExpenseMutation.Variables.Builder.() -> Unit = {}

  ): com.google.firebase.dataconnect.MutationResult<
    CreateExpenseMutation.Data,
    CreateExpenseMutation.Variables
  > =
  ref(
    
      tripId=tripId,amount=amount,category=category,merchant=merchant,
  
    block_
    
  ).execute()


