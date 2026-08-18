
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


import kotlinx.coroutines.flow.filterNotNull as _flow_filterNotNull
import kotlinx.coroutines.flow.map as _flow_map


public interface ListProductsQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
      SpressoConnectorConnector,
      ListProductsQuery.Data,
      Unit
    >
{
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val products: List<ProductsItem>,
  
  ) {
    
      
        @kotlinx.serialization.Serializable
  public data class ProductsItem(
  
    val id: String,
  
    val name: String,
  
    val brand: String,
  
    val category: String,
  
    val price: Double,
  
    val image: String?,
  
    val description: String?,
  
    val likesCount: Int,
  
  ) {
    
    
  }
      
    
    
  }
  

  public companion object {
    public val operationName: String = "ListProducts"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
      kotlinx.serialization.serializer()
  }
}

public fun ListProductsQuery.ref(
  
): com.google.firebase.dataconnect.QueryRef<
    ListProductsQuery.Data,
    Unit
  > =
  ref(
    
      Unit
    
  )

public suspend fun ListProductsQuery.execute(

  

  ): com.google.firebase.dataconnect.QueryResult<
    ListProductsQuery.Data,
    Unit
  > =
  ref(
    
  ).execute()


  public fun ListProductsQuery.flow(
    
    ): kotlinx.coroutines.flow.Flow<ListProductsQuery.Data> =
    ref(
        
      ).subscribe()
      .flow
      ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
      ._flow_filterNotNull()
      ._flow_map { it.data }

