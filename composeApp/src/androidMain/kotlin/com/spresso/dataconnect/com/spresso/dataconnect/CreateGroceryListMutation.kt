
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



public interface CreateGroceryListMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      SpressoConnectorConnector,
      CreateGroceryListMutation.Data,
      CreateGroceryListMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val userId: String,
  
    val title: String,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val groceryList_insert: GroceryListKey,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "CreateGroceryList"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun CreateGroceryListMutation.ref(
  
    userId: String,title: String,

  
  
): com.google.firebase.dataconnect.MutationRef<
    CreateGroceryListMutation.Data,
    CreateGroceryListMutation.Variables
  > =
  ref(
    
      CreateGroceryListMutation.Variables(
        userId=userId,title=title,
  
      )
    
  )

public suspend fun CreateGroceryListMutation.execute(

  
    
      userId: String,title: String,

  

  ): com.google.firebase.dataconnect.MutationResult<
    CreateGroceryListMutation.Data,
    CreateGroceryListMutation.Variables
  > =
  ref(
    
      userId=userId,title=title,
  
    
  ).execute()


