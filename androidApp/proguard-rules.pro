# Keep Kotlin reflection, coroutines, and serialization metadata
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Ktor publishes consumer rules. Suppress optional engine warnings without retaining
# the entire networking stack.
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

# Firebase and Play Services publish consumer rules; broad app-level keep rules would
# disable release shrinking and obfuscation.
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.wallet.** { *; }
-keep class com.google.pay.button.** { *; }
-dontwarn com.google.android.gms.**
