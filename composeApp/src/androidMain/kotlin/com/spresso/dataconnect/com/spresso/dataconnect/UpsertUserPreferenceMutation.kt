
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



public interface UpsertUserPreferenceMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      SpressoConnectorConnector,
      UpsertUserPreferenceMutation.Data,
      UpsertUserPreferenceMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val theme: com.google.firebase.dataconnect.OptionalVariable<String?>,
  
    val pushNotifications: com.google.firebase.dataconnect.OptionalVariable<Boolean?>,
  
    val emailAlerts: com.google.firebase.dataconnect.OptionalVariable<Boolean?>,
  
  ) {
    
    
      
      @kotlin.DslMarker public annotation class BuilderDsl

      
      @BuilderDsl
      public interface Builder {
        public var theme: String?
        public var pushNotifications: Boolean?
        public var emailAlerts: Boolean?
        
      }

      public companion object {
        
        @Suppress("NAME_SHADOWING")
        public fun build(
          
          block_: Builder.() -> Unit
        ): Variables {
          var theme: com.google.firebase.dataconnect.OptionalVariable<String?> =
                com.google.firebase.dataconnect.OptionalVariable.Undefined
            var pushNotifications: com.google.firebase.dataconnect.OptionalVariable<Boolean?> =
                com.google.firebase.dataconnect.OptionalVariable.Undefined
            var emailAlerts: com.google.firebase.dataconnect.OptionalVariable<Boolean?> =
                com.google.firebase.dataconnect.OptionalVariable.Undefined
            

          return object : Builder {
            override var theme: String?
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { theme = com.google.firebase.dataconnect.OptionalVariable.Value(value_) }
              
            override var pushNotifications: Boolean?
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { pushNotifications = com.google.firebase.dataconnect.OptionalVariable.Value(value_) }
              
            override var emailAlerts: Boolean?
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { emailAlerts = com.google.firebase.dataconnect.OptionalVariable.Value(value_) }
              
            
          }.apply(block_)
          .let {
            Variables(
              theme=theme,pushNotifications=pushNotifications,emailAlerts=emailAlerts,
            )
          }
        }
      }
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val userPreference_upsert: UserPreferenceKey,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "UpsertUserPreference"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun UpsertUserPreferenceMutation.ref(
  
    

  
    block_: UpsertUserPreferenceMutation.Variables.Builder.() -> Unit = {}
  
): com.google.firebase.dataconnect.MutationRef<
    UpsertUserPreferenceMutation.Data,
    UpsertUserPreferenceMutation.Variables
  > =
  ref(
    
      UpsertUserPreferenceMutation.Variables.build(
        
  
    block_
      )
    
  )

public suspend fun UpsertUserPreferenceMutation.execute(

  
    
      

  
    block_: UpsertUserPreferenceMutation.Variables.Builder.() -> Unit = {}

  ): com.google.firebase.dataconnect.MutationResult<
    UpsertUserPreferenceMutation.Data,
    UpsertUserPreferenceMutation.Variables
  > =
  ref(
    
      
  
    block_
    
  ).execute()


