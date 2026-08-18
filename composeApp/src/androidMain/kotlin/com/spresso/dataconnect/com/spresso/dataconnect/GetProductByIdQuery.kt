
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


public interface GetProductByIdQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
      SpressoConnectorConnector,
      GetProductByIdQuery.Data,
      GetProductByIdQuery.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val id: String,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val product: Product?,
  
  ) {
    
      
        @kotlinx.serialization.Serializable
  public data class Product(
  
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
    public val operationName: String = "GetProductById"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun GetProductByIdQuery.ref(
  
    id: String,

  
  
): com.google.firebase.dataconnect.QueryRef<
    GetProductByIdQuery.Data,
    GetProductByIdQuery.Variables
  > =
  ref(
    
      GetProductByIdQuery.Variables(
        id=id,
  
      )
    
  )

public suspend fun GetProductByIdQuery.execute(

  
    
      id: String,

  

  ): com.google.firebase.dataconnect.QueryResult<
    GetProductByIdQuery.Data,
    GetProductByIdQuery.Variables
  > =
  ref(
    
      id=id,
  
    
  ).execute()


  public fun GetProductByIdQuery.flow(
    
      id: String,

  
    
    ): kotlinx.coroutines.flow.Flow<GetProductByIdQuery.Data> =
    ref(
        
          id=id,
  
        
      ).subscribe()
      .flow
      ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
      ._flow_filterNotNull()
      ._flow_map { it.data }

