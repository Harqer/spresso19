
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



public interface DeleteGroceryItemMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      SpressoConnectorConnector,
      DeleteGroceryItemMutation.Data,
      DeleteGroceryItemMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val groceryListItem_delete: GroceryListItemKey?,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "DeleteGroceryItem"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun DeleteGroceryItemMutation.ref(
  
    id: java.util.UUID,

  
  
): com.google.firebase.dataconnect.MutationRef<
    DeleteGroceryItemMutation.Data,
    DeleteGroceryItemMutation.Variables
  > =
  ref(
    
      DeleteGroceryItemMutation.Variables(
        id=id,
  
      )
    
  )

public suspend fun DeleteGroceryItemMutation.execute(

  
    
      id: java.util.UUID,

  

  ): com.google.firebase.dataconnect.MutationResult<
    DeleteGroceryItemMutation.Data,
    DeleteGroceryItemMutation.Variables
  > =
  ref(
    
      id=id,
  
    
  ).execute()


