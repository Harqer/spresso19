
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



public interface ConnectCoinbaseWalletMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      SpressoConnectorConnector,
      ConnectCoinbaseWalletMutation.Data,
      ConnectCoinbaseWalletMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val walletAddress: String,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val coinbaseWallet_upsert: CoinbaseWalletKey,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "ConnectCoinbaseWallet"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun ConnectCoinbaseWalletMutation.ref(
  
    walletAddress: String,

  
  
): com.google.firebase.dataconnect.MutationRef<
    ConnectCoinbaseWalletMutation.Data,
    ConnectCoinbaseWalletMutation.Variables
  > =
  ref(
    
      ConnectCoinbaseWalletMutation.Variables(
        walletAddress=walletAddress,
  
      )
    
  )

public suspend fun ConnectCoinbaseWalletMutation.execute(

  
    
      walletAddress: String,

  

  ): com.google.firebase.dataconnect.MutationResult<
    ConnectCoinbaseWalletMutation.Data,
    ConnectCoinbaseWalletMutation.Variables
  > =
  ref(
    
      walletAddress=walletAddress,
  
    
  ).execute()


