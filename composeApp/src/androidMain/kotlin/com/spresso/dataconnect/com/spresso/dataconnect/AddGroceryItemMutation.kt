
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



public interface AddGroceryItemMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      SpressoConnectorConnector,
      AddGroceryItemMutation.Data,
      AddGroceryItemMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val listId: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
    val productName: String,
  
    val productId: com.google.firebase.dataconnect.OptionalVariable<String?>,
  
    val addedVia: String,
  
  ) {
    
    
      
      @kotlin.DslMarker public annotation class BuilderDsl

      
      @BuilderDsl
      public interface Builder {
        public var listId: java.util.UUID
        public var productName: String
        public var productId: String?
        public var addedVia: String
        
      }

      public companion object {
        
        @Suppress("NAME_SHADOWING")
        public fun build(
          listId: java.util.UUID,productName: String,addedVia: String,
          block_: Builder.() -> Unit
        ): Variables {
          var listId= listId
            var productName= productName
            var productId: com.google.firebase.dataconnect.OptionalVariable<String?> =
                com.google.firebase.dataconnect.OptionalVariable.Undefined
            var addedVia= addedVia
            

          return object : Builder {
            override var listId: java.util.UUID
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { listId = value_ }
              
            override var productName: String
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { productName = value_ }
              
            override var productId: String?
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { productId = com.google.firebase.dataconnect.OptionalVariable.Value(value_) }
              
            override var addedVia: String
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { addedVia = value_ }
              
            
          }.apply(block_)
          .let {
            Variables(
              listId=listId,productName=productName,productId=productId,addedVia=addedVia,
            )
          }
        }
      }
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val groceryListItem_insert: GroceryListItemKey,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "AddGroceryItem"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun AddGroceryItemMutation.ref(
  
    listId: java.util.UUID,productName: String,addedVia: String,

  
    block_: AddGroceryItemMutation.Variables.Builder.() -> Unit = {}
  
): com.google.firebase.dataconnect.MutationRef<
    AddGroceryItemMutation.Data,
    AddGroceryItemMutation.Variables
  > =
  ref(
    
      AddGroceryItemMutation.Variables.build(
        listId=listId,productName=productName,addedVia=addedVia,
  
    block_
      )
    
  )

public suspend fun AddGroceryItemMutation.execute(

  
    
      listId: java.util.UUID,productName: String,addedVia: String,

  
    block_: AddGroceryItemMutation.Variables.Builder.() -> Unit = {}

  ): com.google.firebase.dataconnect.MutationResult<
    AddGroceryItemMutation.Data,
    AddGroceryItemMutation.Variables
  > =
  ref(
    
      listId=listId,productName=productName,addedVia=addedVia,
  
    block_
    
  ).execute()


