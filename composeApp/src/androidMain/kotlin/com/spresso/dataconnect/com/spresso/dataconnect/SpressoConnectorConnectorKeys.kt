
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
  public data class CoinbaseWalletKey(
  
    val userId: String,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class GroceryListItemKey(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class GroceryListKey(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class OnboardingStatusKey(
  
    val userId: String,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class OrderKey(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class PasskeyCredentialKey(
  
    val userId: String,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class PaymentMethodKey(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class TravelExpenseKey(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class UserKey(
  
    val id: String,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class UserLikeKey(
  
    val userUid: String,
  
    val productId: String,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class UserPreferenceKey(
  
    val userId: String,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class UserSubscriptionKey(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class VideoKey(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class VisionHistoryKey(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class VoiceNoteKey(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class WardrobeItemKey(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
  ) {
    
    
  }

  @kotlinx.serialization.Serializable
  public data class WardrobeOutfitKey(
  
    val id: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
  ) {
    
    
  }

