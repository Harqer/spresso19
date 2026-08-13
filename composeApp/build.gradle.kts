import java.util.Properties

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.androidApplication)
    alias(libs.plugins.jetbrainsCompose)
    alias(libs.plugins.composeCompiler)
    alias(libs.plugins.kotlinSerialization)
    id("com.google.gms.google-services")
    id("com.google.firebase.crashlytics")
}

kotlin {
    androidTarget {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_1_8)
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
            implementation(libs.androidx.activity.compose)
            implementation(libs.ktor.client.android)
            implementation(dependencies.platform("com.google.firebase:firebase-bom:33.1.2"))
            implementation("com.google.firebase:firebase-auth")
            implementation("com.google.firebase:firebase-crashlytics")
            implementation("com.google.firebase:firebase-analytics")
            implementation("com.google.firebase:firebase-dataconnect:17.3.3")
            implementation("com.google.pay.button:compose-pay-button:1.1.0")
            implementation("com.google.android.gms:play-services-wallet:19.4.0")
            implementation(libs.androidx.camera.core)
            implementation(libs.androidx.camera.camera2)
            implementation(libs.androidx.camera.lifecycle)
            implementation(libs.androidx.camera.view)
            implementation(libs.androidx.camera.extensions)
            implementation("androidx.credentials:credentials:1.6.0")
            implementation("androidx.credentials:credentials-play-services-auth:1.6.0")
            implementation("com.google.android.libraries.identity.googleid:googleid:1.2.0")
            implementation("androidx.compose.ui:ui-tooling-preview:1.6.8")
            implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.3")
            implementation("androidx.biometric:biometric:1.2.0-alpha05")
        }
        val androidUnitTest = sourceSets.getByName("androidUnitTest")
        androidUnitTest.dependencies {
            implementation(kotlin("test"))
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
        }
        val commonTest = sourceSets.getByName("commonTest")
        commonTest.dependencies {
            implementation(kotlin("test"))
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
        }
        commonMain.dependencies {
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
            implementation("io.ktor:ktor-client-websockets:3.0.0")
        }
        wasmJsMain.dependencies {
            implementation(libs.ktor.client.js)
        }
    }
}

android {
    namespace = "com.spresso19"
    compileSdk = 35

    sourceSets["main"].manifest.srcFile("src/androidMain/AndroidManifest.xml")
    sourceSets["main"].res.srcDirs("src/androidMain/res")

    defaultConfig {
        applicationId = "com.spresso19"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }

    experimentalProperties["android.experimental.enableScreenshotTest"] = true

    signingConfigs {
        create("release") {
            storeFile = file("spresso.keystore")
            storePassword = "spresso123"
            keyAlias = "spresso"
            keyPassword = "spresso123"
            enableV1Signing = true
            enableV2Signing = true
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
        getByName("debug") {
            signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}

