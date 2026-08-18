
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



public interface RegisterPasskeyMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      SpressoConnectorConnector,
      RegisterPasskeyMutation.Data,
      RegisterPasskeyMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val credentialId: String,
  
    val publicKey: String,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val passkeyCredential_upsert: PasskeyCredentialKey,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "RegisterPasskey"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun RegisterPasskeyMutation.ref(
  
    credentialId: String,publicKey: String,

  
  
): com.google.firebase.dataconnect.MutationRef<
    RegisterPasskeyMutation.Data,
    RegisterPasskeyMutation.Variables
  > =
  ref(
    
      RegisterPasskeyMutation.Variables(
        credentialId=credentialId,publicKey=publicKey,
  
      )
    
  )

public suspend fun RegisterPasskeyMutation.execute(

  
    
      credentialId: String,publicKey: String,

  

  ): com.google.firebase.dataconnect.MutationResult<
    RegisterPasskeyMutation.Data,
    RegisterPasskeyMutation.Variables
  > =
  ref(
    
      credentialId=credentialId,publicKey=publicKey,
  
    
  ).execute()


