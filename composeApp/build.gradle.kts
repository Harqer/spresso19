import java.util.Properties

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
            implementation(libs.mwdat.mockdevice)
            implementation(libs.androidx.activity.compose)
            implementation(libs.ktor.client.android)
            implementation(libs.androidx.appfunctions)
            implementation(dependencies.platform(libs.firebase.bom))
            implementation(libs.firebase.auth)
            implementation(libs.firebase.crashlytics)
            implementation(libs.firebase.analytics)
            implementation(libs.firebase.dataconnect)
            implementation(libs.firebase.functions)
            implementation(libs.compose.pay.button)
            implementation(libs.play.services.wallet)
            implementation(libs.androidx.camera.core)
            implementation(libs.androidx.camera.camera2)
            implementation(libs.androidx.camera.lifecycle)
            implementation(libs.androidx.camera.view)
            implementation(libs.androidx.camera.extensions)
            implementation(libs.androidx.camera.mlkit.vision)
            implementation(libs.mlkit.vision.detection)
            implementation(libs.mlkit.vision.text)
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
        }
        commonMain.dependencies {
            implementation(libs.material3.adaptive.navigation.suite)
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
    namespace = "com.spresso19"
    compileSdk = 37

    sourceSets["main"].manifest.srcFile("src/androidMain/AndroidManifest.xml")
    sourceSets["main"].res.srcDirs("src/androidMain/res")

    defaultConfig {
        applicationId = "com.spresso19"
        minSdk = 30
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        manifestPlaceholders["mwdat_application_id"] = System.getenv("META_APP_ID") ?: "0"
        manifestPlaceholders["mwdat_client_token"] = System.getenv("META_CLIENT_TOKEN") ?: "0"
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
            storeFile = file("spresso.keystore")
            storePassword = System.getenv("KEYSTORE_PASSWORD") ?: ""
            keyAlias = System.getenv("KEY_ALIAS") ?: "spresso"
            keyPassword = System.getenv("KEY_PASSWORD") ?: ""
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
            
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    
}
