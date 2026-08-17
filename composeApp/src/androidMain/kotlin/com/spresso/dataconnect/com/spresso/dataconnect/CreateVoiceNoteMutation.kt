
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



public interface CreateVoiceNoteMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      SpressoConnectorConnector,
      CreateVoiceNoteMutation.Data,
      CreateVoiceNoteMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val tripId: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
    val transcript: String,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val voiceNote_insert: VoiceNoteKey,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "CreateVoiceNote"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun CreateVoiceNoteMutation.ref(
  
    tripId: java.util.UUID,transcript: String,

  
  
): com.google.firebase.dataconnect.MutationRef<
    CreateVoiceNoteMutation.Data,
    CreateVoiceNoteMutation.Variables
  > =
  ref(
    
      CreateVoiceNoteMutation.Variables(
        tripId=tripId,transcript=transcript,
  
      )
    
  )

public suspend fun CreateVoiceNoteMutation.execute(

  
    
      tripId: java.util.UUID,transcript: String,

  

  ): com.google.firebase.dataconnect.MutationResult<
    CreateVoiceNoteMutation.Data,
    CreateVoiceNoteMutation.Variables
  > =
  ref(
    
      tripId=tripId,transcript=transcript,
  
    
  ).execute()


