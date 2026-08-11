# Keep Kotlin reflection, coroutines, and serialization metadata
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Kotlin Multiplatform / Jetpack Compose keep rules
-keep class androidx.compose.ui.platform.** { *; }
-keepclassmembers class * extends androidx.compose.ui.platform.AbstractComposeView {
    public <init>(...);
}

# Ktor generic keep rules
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**

# Kotlinx Serialization rules
-keepattributes *Annotation*,Signature
-keepclassmembers class * {
    @kotlinx.serialization.SerialName <fields>;
}
-keep class *$$serializer { *; }
-keepclassmembers class * {
    *** Companion;
}

# Firebase & Play Services Wallet generic keep rules
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.wallet.** { *; }
-keep class com.google.pay.button.** { *; }
-dontwarn com.google.android.gms.**
