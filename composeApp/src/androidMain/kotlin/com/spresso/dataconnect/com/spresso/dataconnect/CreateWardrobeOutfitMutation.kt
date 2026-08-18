
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



public interface CreateWardrobeOutfitMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      SpressoConnectorConnector,
      CreateWardrobeOutfitMutation.Data,
      CreateWardrobeOutfitMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val title: String,
  
    val description: com.google.firebase.dataconnect.OptionalVariable<String?>,
  
    val imageUrl: com.google.firebase.dataconnect.OptionalVariable<String?>,
  
  ) {
    
    
      
      @kotlin.DslMarker public annotation class BuilderDsl

      
      @BuilderDsl
      public interface Builder {
        public var title: String
        public var description: String?
        public var imageUrl: String?
        
      }

      public companion object {
        
        @Suppress("NAME_SHADOWING")
        public fun build(
          title: String,
          block_: Builder.() -> Unit
        ): Variables {
          var title= title
            var description: com.google.firebase.dataconnect.OptionalVariable<String?> =
                com.google.firebase.dataconnect.OptionalVariable.Undefined
            var imageUrl: com.google.firebase.dataconnect.OptionalVariable<String?> =
                com.google.firebase.dataconnect.OptionalVariable.Undefined
            

          return object : Builder {
            override var title: String
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { title = value_ }
              
            override var description: String?
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { description = com.google.firebase.dataconnect.OptionalVariable.Value(value_) }
              
            override var imageUrl: String?
              get() = throw UnsupportedOperationException("getting builder values is not supported")
              set(value_) { imageUrl = com.google.firebase.dataconnect.OptionalVariable.Value(value_) }
              
            
          }.apply(block_)
          .let {
            Variables(
              title=title,description=description,imageUrl=imageUrl,
            )
          }
        }
      }
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val wardrobeOutfit_insert: WardrobeOutfitKey,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "CreateWardrobeOutfit"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun CreateWardrobeOutfitMutation.ref(
  
    title: String,

  
    block_: CreateWardrobeOutfitMutation.Variables.Builder.() -> Unit = {}
  
): com.google.firebase.dataconnect.MutationRef<
    CreateWardrobeOutfitMutation.Data,
    CreateWardrobeOutfitMutation.Variables
  > =
  ref(
    
      CreateWardrobeOutfitMutation.Variables.build(
        title=title,
  
    block_
      )
    
  )

public suspend fun CreateWardrobeOutfitMutation.execute(

  
    
      title: String,

  
    block_: CreateWardrobeOutfitMutation.Variables.Builder.() -> Unit = {}

  ): com.google.firebase.dataconnect.MutationResult<
    CreateWardrobeOutfitMutation.Data,
    CreateWardrobeOutfitMutation.Variables
  > =
  ref(
    
      title=title,
  
    block_
    
  ).execute()


