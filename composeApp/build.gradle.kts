import java.util.Properties
import org.gradle.api.tasks.testing.Test
import org.gradle.jvm.toolchain.JavaLanguageVersion
import org.gradle.jvm.toolchain.JavaToolchainService

val MISSING_RELEASE_VALUE = "__MISSING_RELEASE_CONFIGURATION__"

private fun String.asBuildConfigString(): String =
    "\"${replace("\\", "\\\\").replace("\"", "\\\"")}\""

val releaseMetaAppId = providers.environmentVariable("META_APP_ID").orNull ?: MISSING_RELEASE_VALUE
val releaseMetaClientToken = providers.environmentVariable("META_CLIENT_TOKEN").orNull ?: MISSING_RELEASE_VALUE
val releaseStripePublishableKey =
    providers.environmentVariable("STRIPE_PUBLISHABLE_KEY").orNull ?: MISSING_RELEASE_VALUE
val firebaseWebClientId = "426485634252-3lv16vue7mfp7gau6ede6jfgh57rnp0k.apps.googleusercontent.com"
val googleWebClientId =
    providers.environmentVariable("GOOGLE_WEB_CLIENT_ID").orNull?.takeIf(String::isNotBlank)
        ?: firebaseWebClientId
val releaseKeystorePath = providers.environmentVariable("ANDROID_KEYSTORE_PATH").orNull ?: "release.jks"
val releaseKeystorePassword = providers.environmentVariable("KEYSTORE_PASSWORD").orNull.orEmpty()
val releaseKeyAlias = providers.environmentVariable("KEY_ALIAS").orNull.orEmpty()
val releaseKeyPassword = providers.environmentVariable("KEY_PASSWORD").orNull.orEmpty()
val releaseGithubToken = providers.environmentVariable("GITHUB_TOKEN").orNull.orEmpty()

val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localProperties.load(localPropertiesFile.inputStream())
}
val debugMetaAppId = localProperties.getProperty("mwdat_application_id") ?: "0"
val debugMetaClientToken = localProperties.getProperty("mwdat_client_token") ?: "0"
val verifyReleaseConfiguration by tasks.registering {
    group = "verification"
    description = "Fails closed when required Android release credentials are unavailable."
    doLast {
        val missing =
            buildList {
                if (releaseMetaAppId.isBlank() || releaseMetaAppId == "0" || releaseMetaAppId == MISSING_RELEASE_VALUE) add("META_APP_ID")
                if (releaseMetaClientToken.isBlank() || releaseMetaClientToken == "0" || releaseMetaClientToken == MISSING_RELEASE_VALUE) add("META_CLIENT_TOKEN")
                if (!releaseStripePublishableKey.startsWith("pk_live_")) add("STRIPE_PUBLISHABLE_KEY (pk_live_… required)")
                if (googleWebClientId.isBlank()) add("GOOGLE_WEB_CLIENT_ID")
                if (!file(releaseKeystorePath).isFile) add("ANDROID_KEYSTORE_PATH ($releaseKeystorePath not found)")
                if (releaseKeystorePassword.isBlank()) add("KEYSTORE_PASSWORD")
                if (releaseKeyAlias.isBlank()) add("KEY_ALIAS")
                if (releaseKeyPassword.isBlank()) add("KEY_PASSWORD")
                if (releaseGithubToken.isBlank()) add("GITHUB_TOKEN (Meta DAT package read access)")
            }
        check(missing.isEmpty()) {
            "Release configuration is incomplete: ${missing.joinToString()}. Supply values through CI secrets/Secret Manager; release placeholders are forbidden."
        }
    }
}

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.androidApplication)
    alias(libs.plugins.jetbrainsCompose)
    alias(libs.plugins.composeCompiler)
    alias(libs.plugins.kotlinSerialization)
    id("com.google.gms.google-services")
    id("com.google.firebase.crashlytics")
    alias(libs.plugins.screenshot)
    
    jacoco
}

kotlin {
    targets.configureEach {
        compilations.configureEach {
            compileTaskProvider.configure {
                compilerOptions {
                    freeCompilerArgs.add("-Xexpect-actual-classes")
                }
            }
        }
    }
    androidTarget {
        compilations.configureEach {
            compileTaskProvider.configure {
                compilerOptions {
                    jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
                }
            }
        }
    }
    
    @OptIn(org.jetbrains.kotlin.gradle.ExperimentalWasmDsl::class)
    wasmJs {
        outputModuleName.set("composeApp")
        browser {
            commonWebpackConfig {
                outputFileName = "composeApp.js"
            }
        }
        binaries.executable()
    }
    
    sourceSets {
        androidMain.dependencies {
            implementation(libs.androidx.navigation3.ui)
            implementation(libs.androidx.navigation3.runtime)
            implementation(libs.mwdat.core)
            implementation(libs.mwdat.camera)
            implementation(libs.mwdat.display)
            implementation(libs.androidx.activity.compose)
            implementation(libs.ktor.client.android)
            implementation(libs.androidx.appfunctions)
            implementation(dependencies.platform(libs.firebase.bom))
            implementation(libs.firebase.auth)
            implementation(libs.firebase.crashlytics)
            implementation(libs.firebase.analytics)
            implementation(libs.firebase.dataconnect)
            implementation(libs.firebase.functions)
            implementation(libs.firebase.messaging)
            implementation(libs.firebase.storage)
            implementation(libs.firebase.vertexai)
            implementation(libs.firebase.appcheck.playintegrity)
            implementation(libs.firebase.ui.auth)
            implementation(libs.compose.pay.button)
            implementation("com.google.android.gms:play-services-location:21.3.0")
            implementation(libs.play.services.wallet)
            implementation(libs.androidx.camera.core)
            implementation(libs.androidx.camera.camera2)
            implementation(libs.androidx.camera.lifecycle)
            implementation(libs.androidx.camera.view)
            implementation(libs.androidx.camera.extensions)
            implementation(libs.androidx.camera.mlkit.vision)
            implementation(libs.mlkit.vision.detection)
            implementation(libs.mlkit.image.labeling)
            implementation(libs.mlkit.vision.text)
            implementation("com.google.mlkit:translate:17.0.2")
            implementation(libs.androidx.credentials)
            implementation(libs.androidx.credentials.play.services.auth)
            implementation(libs.googleid)
            implementation(libs.androidx.ui.tooling)
            implementation(libs.androidx.ui.tooling.preview)
            implementation(libs.androidx.lifecycle.compose)
            implementation(libs.androidx.biometric)
            implementation(libs.androidx.core.splashscreen)
            implementation(libs.billing.ktx)
            implementation(libs.engage.core)
            implementation(libs.androidx.work.runtime.ktx)
            implementation(libs.kotlinx.coroutines.play.services)
            implementation(libs.androidx.glance.appwidget)
            implementation(libs.androidx.glance.material3)
            implementation(libs.androidx.xr.glimmer)
            implementation(libs.androidx.xr.runtime)
            implementation(libs.androidx.xr.scenecore)
            implementation(libs.coinbase.wallet.mobile.sdk)
            implementation(libs.zxing.core)
            implementation(libs.zxing.core)
        }
        val androidUnitTest = sourceSets.getByName("androidUnitTest")
        androidUnitTest.dependencies {
            implementation(kotlin("test"))
            implementation(libs.kotlinx.coroutines.test)
            implementation(libs.junit)
            implementation(libs.robolectric)
            implementation(libs.mockk)
            implementation(libs.koin.test)
            implementation(libs.androidx.compose.ui.test.junit4)
            implementation(libs.androidx.compose.ui.test.manifest)
        }
        val commonTest = sourceSets.getByName("commonTest")
        commonTest.dependencies {
            implementation(kotlin("test"))
            implementation(libs.kotlinx.coroutines.test)
        }
        val androidInstrumentedTest = sourceSets.getByName("androidInstrumentedTest")
        androidInstrumentedTest.dependencies {
            implementation(libs.androidx.compose.ui.test.junit4)
            implementation(libs.mwdat.mockdevice)
        }
        commonMain.dependencies {
            implementation(libs.material3.adaptive.navigation.suite)
            implementation(libs.androidx.navigation3.runtime)
            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation(compose.materialIconsExtended)
            implementation(compose.ui)
            implementation(compose.components.resources)
            implementation(compose.components.uiToolingPreview)
            
            implementation(libs.ktor.client.core)
            implementation(libs.ktor.client.content.negotiation)
            implementation(libs.ktor.serialization.kotlinx.json)
            implementation(libs.kotlinx.coroutines.core)
            implementation(libs.kotlinx.serialization.json)
            implementation(libs.kotlinx.datetime)
            implementation(libs.ktor.client.websockets)
            implementation(libs.koin.core)
        }
        wasmJsMain.dependencies {
            implementation(libs.ktor.client.js)
        }
    }
}

android {
    namespace = "com.spresso"
    compileSdk = 37

    sourceSets["main"].manifest.srcFile("src/androidMain/AndroidManifest.xml")
    sourceSets["main"].res.srcDirs("src/androidMain/res")

    defaultConfig {
        applicationId = "com.spresso"
        minSdk = 30
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", googleWebClientId.asBuildConfigString())
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }

    buildFeatures {
        resValues = true
        buildConfig = true
    }

    experimentalProperties["android.experimental.enableScreenshotTest"] = true

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
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
        getByName("debug") {
            // DAT permits zero-value developer credentials only in Developer Mode.
            // Using local.properties allows testing with actual hardware during local development.
            manifestPlaceholders["mwdat_application_id"] = debugMetaAppId
            manifestPlaceholders["mwdat_client_token"] = debugMetaClientToken
            buildConfigField(
                "String",
                "STRIPE_PUBLISHABLE_KEY",
                (providers.environmentVariable("STRIPE_PUBLISHABLE_KEY").orNull ?: "pk_test_debug_not_configured").asBuildConfigString(),
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    // MockDeviceKit is available to debug builds and instrumentation tests, never release runtime.
    add("debugImplementation", libs.mwdat.mockdevice)
}

// Robolectric 4.11's bytecode reader cannot instrument Java 25 classes. Keep
// local and CI unit tests on the same supported runtime as the Android app.
val androidTestJavaLauncher =
    extensions.getByType(JavaToolchainService::class.java).launcherFor {
        languageVersion.set(JavaLanguageVersion.of(17))
    }

tasks.withType<Test>().configureEach {
    javaLauncher.set(androidTestJavaLauncher)
}

tasks.configureEach {
    if (name == "preReleaseBuild") {
        dependsOn(verifyReleaseConfiguration)
    }
}
