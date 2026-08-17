
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



public interface ToggleGroceryItemMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      SpressoConnectorConnector,
      ToggleGroceryItemMutation.Data,
      ToggleGroceryItemMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
    val isPurchased: Boolean,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val groceryListItem_update: GroceryListItemKey?,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "ToggleGroceryItem"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun ToggleGroceryItemMutation.ref(
  
    id: java.util.UUID,isPurchased: Boolean,

  
  
): com.google.firebase.dataconnect.MutationRef<
    ToggleGroceryItemMutation.Data,
    ToggleGroceryItemMutation.Variables
  > =
  ref(
    
      ToggleGroceryItemMutation.Variables(
        id=id,isPurchased=isPurchased,
  
      )
    
  )

public suspend fun ToggleGroceryItemMutation.execute(

  
    
      id: java.util.UUID,isPurchased: Boolean,

  

  ): com.google.firebase.dataconnect.MutationResult<
    ToggleGroceryItemMutation.Data,
    ToggleGroceryItemMutation.Variables
  > =
  ref(
    
      id=id,isPurchased=isPurchased,
  
    
  ).execute()


