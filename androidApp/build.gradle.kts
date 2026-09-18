import java.util.Properties
import org.gradle.api.tasks.testing.Test
import org.gradle.jvm.toolchain.JavaLanguageVersion
import org.gradle.jvm.toolchain.JavaToolchainService

val missingReleaseValue = "__MISSING_RELEASE_CONFIGURATION__"
val firebaseWebClientId = "426485634252-3lv16vue7mfp7gau6ede6jfgh57rnp0k.apps.googleusercontent.com"
val googleWebClientId =
    providers.environmentVariable("GOOGLE_WEB_CLIENT_ID").orNull?.takeIf(String::isNotBlank)
        ?: firebaseWebClientId
val releaseMetaAppId = providers.environmentVariable("META_APP_ID").orNull ?: missingReleaseValue
val releaseMetaClientToken = providers.environmentVariable("META_CLIENT_TOKEN").orNull ?: missingReleaseValue
val releaseStripePublishableKey = providers.environmentVariable("STRIPE_PUBLISHABLE_KEY").orNull ?: missingReleaseValue
val releaseKeystorePath = providers.environmentVariable("ANDROID_KEYSTORE_PATH").orNull ?: "release.jks"
val releaseKeystorePassword = providers.environmentVariable("KEYSTORE_PASSWORD").orNull.orEmpty()
val releaseKeyAlias = providers.environmentVariable("KEY_ALIAS").orNull.orEmpty()
val releaseKeyPassword = providers.environmentVariable("KEY_PASSWORD").orNull.orEmpty()
val releaseGithubToken = providers.environmentVariable("GITHUB_TOKEN").orNull.orEmpty()

val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) localProperties.load(localPropertiesFile.inputStream())
val debugMetaAppId = localProperties.getProperty("mwdat_application_id") ?: "0"
val debugMetaClientToken = localProperties.getProperty("mwdat_client_token") ?: "0"

private fun String.asBuildConfigString(): String =
    "\"${replace("\\", "\\\\").replace("\"", "\\\"")}\""

val verifyReleaseConfiguration by tasks.registering {
    group = "verification"
    description = "Fails closed when Android release credentials are unavailable."
    doLast {
        val missing = buildList {
            if (releaseMetaAppId.isBlank() || releaseMetaAppId == "0" || releaseMetaAppId == missingReleaseValue) add("META_APP_ID")
            if (releaseMetaClientToken.isBlank() || releaseMetaClientToken == "0" || releaseMetaClientToken == missingReleaseValue) add("META_CLIENT_TOKEN")
            if (!releaseStripePublishableKey.startsWith("pk_live_")) add("STRIPE_PUBLISHABLE_KEY (pk_live_ required)")
            if (googleWebClientId.isBlank()) add("GOOGLE_WEB_CLIENT_ID")
            if (!file(releaseKeystorePath).isFile) add("ANDROID_KEYSTORE_PATH ($releaseKeystorePath not found)")
            if (releaseKeystorePassword.isBlank()) add("KEYSTORE_PASSWORD")
            if (releaseKeyAlias.isBlank()) add("KEY_ALIAS")
            if (releaseKeyPassword.isBlank()) add("KEY_PASSWORD")
            if (releaseGithubToken.isBlank()) add("GITHUB_TOKEN (Meta DAT package read access)")
        }
        check(missing.isEmpty()) {
            "Release configuration is incomplete: ${missing.joinToString()}. Supply values through CI secrets."
        }
    }
}

plugins {
    alias(libs.plugins.androidApplication)
    alias(libs.plugins.composeCompiler)
    id("com.google.gms.google-services")
    id("com.google.firebase.crashlytics")
}

android {
    namespace = "com.spresso.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.spresso"
        minSdk = 30
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", googleWebClientId.asBuildConfigString())
    }

    buildFeatures {
        compose = true
        buildConfig = true
        resValues = true
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }

    defaultConfig {
        resValue("string", "google_web_client_id", googleWebClientId)
    }

    signingConfigs {
        create("release") {
            storeFile = file(releaseKeystorePath)
            storePassword = releaseKeystorePassword
            keyAlias = releaseKeyAlias
            keyPassword = releaseKeyPassword
            enableV1Signing = true
            enableV2Signing = true
        }
    }

    buildTypes {
        getByName("release") {
            manifestPlaceholders["mwdat_application_id"] = releaseMetaAppId
            manifestPlaceholders["mwdat_client_token"] = releaseMetaClientToken
            buildConfigField("String", "STRIPE_PUBLISHABLE_KEY", releaseStripePublishableKey.asBuildConfigString())
            resValue("string", "stripe_publishable_key", releaseStripePublishableKey)
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
        getByName("debug") {
            manifestPlaceholders["mwdat_application_id"] = debugMetaAppId
            manifestPlaceholders["mwdat_client_token"] = debugMetaClientToken
            val debugStripeKey = providers.environmentVariable("STRIPE_PUBLISHABLE_KEY").orNull ?: "pk_test_debug_not_configured"
            buildConfigField("String", "STRIPE_PUBLISHABLE_KEY", debugStripeKey.asBuildConfigString())
            resValue("string", "stripe_publishable_key", debugStripeKey)
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(project(":composeApp"))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.navigation3.runtime)
    implementation("androidx.fragment:fragment-ktx:1.5.7")
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services.auth)
    implementation(libs.googleid)
    implementation(libs.androidx.lifecycle.compose)
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation(dependencies.platform(libs.firebase.bom))
    implementation(libs.firebase.auth)
    implementation(libs.firebase.dataconnect)
    implementation(libs.firebase.ui.auth)
    implementation(libs.androidx.compose.runtime)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    debugImplementation(libs.androidx.ui.tooling)
}

tasks.withType<Test>().configureEach {
    javaLauncher.set(
        extensions.getByType(JavaToolchainService::class.java).launcherFor {
            languageVersion.set(JavaLanguageVersion.of(17))
        },
    )
}

tasks.configureEach {
    if (name == "preReleaseBuild") dependsOn(verifyReleaseConfiguration)
}
