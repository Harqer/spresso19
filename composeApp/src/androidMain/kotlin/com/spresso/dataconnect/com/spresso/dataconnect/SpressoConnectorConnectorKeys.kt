
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


  @kotlinx.serialization.Serializable
  public data class OrderKey(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class UserLikeKey(
  
    val userUid: String,
  
    val productId: String,
  
  ) {
    
    
  }

