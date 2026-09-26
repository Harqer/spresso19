import org.gradle.api.tasks.testing.Test
import org.gradle.jvm.toolchain.JavaLanguageVersion
import org.gradle.jvm.toolchain.JavaToolchainService

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.androidKotlinMultiplatformLibrary)
    alias(libs.plugins.jetbrainsCompose)
    alias(libs.plugins.composeCompiler)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.detekt)
    alias(libs.plugins.ksp)
    jacoco
}

detekt {
    buildUponDefaultConfig = true
    allRules = false
    config.setFrom(rootProject.layout.projectDirectory.file("config/detekt/detekt.yml"))
    parallel = true
    source.setFrom(
        rootProject.layout.projectDirectory.dir("composeApp/src/commonMain/kotlin"),
        rootProject.layout.projectDirectory.dir("composeApp/src/androidMain/kotlin"),
        rootProject.layout.projectDirectory.dir("composeApp/src/commonTest/kotlin"),
        rootProject.layout.projectDirectory.dir("composeApp/src/wasmJsMain/kotlin"),
        rootProject.layout.projectDirectory.dir("composeApp/src/iosMain/kotlin"),
        rootProject.layout.projectDirectory.dir("composeApp/src/desktopMain/kotlin"),
    )
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
    android {
        namespace = "com.spresso.shared"
        compileSdk = 37
        minSdk = 30
        androidResources {
            enable = true
        }
        withHostTest {
            isIncludeAndroidResources = true
        }
        withDeviceTest {
            instrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        }
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
            freeCompilerArgs.add("-Xlambdas=indy")
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
            implementation(libs.firebase.messaging)
            implementation(libs.firebase.appcheck.playintegrity)
            implementation(libs.firebase.ui.auth)
            implementation(libs.convex.android)
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
            implementation(libs.androidx.ui.text.google.fonts)
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
        }
        val androidHostTest = sourceSets.getByName("androidHostTest")
        androidHostTest.dependencies {
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
        val androidDeviceTest = sourceSets.getByName("androidDeviceTest")
        androidDeviceTest.dependencies {
            implementation(libs.androidx.compose.ui.test.junit4)
            implementation(libs.mwdat.mockdevice)
        }
        commonMain.dependencies {
            implementation(libs.material3.adaptive.navigation.suite)
            implementation(libs.androidx.navigation3.runtime)
            implementation("org.jetbrains.compose.runtime:runtime:${libs.versions.compose.plugin.get()}")
            implementation("org.jetbrains.compose.foundation:foundation:${libs.versions.compose.plugin.get()}")
            implementation("org.jetbrains.compose.material3:material3:1.9.0")
            implementation("org.jetbrains.compose.material:material-icons-extended:1.7.3")
            implementation("org.jetbrains.compose.ui:ui:${libs.versions.compose.plugin.get()}")
            implementation("org.jetbrains.compose.components:components-resources:${libs.versions.compose.plugin.get()}")
            implementation("org.jetbrains.compose.ui:ui-tooling-preview:${libs.versions.compose.plugin.get()}")
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

ksp {
    arg("appfunctions:aggregateAppFunctions", "true")
}

dependencies {
    add("kspAndroid", libs.androidx.appfunctions.compiler)
}

tasks.withType<dev.detekt.gradle.Detekt>().configureEach {
    jvmTarget = "17"
    // Generated accessors and Firebase Data Connect bindings are not hand-maintained code.
    exclude("**/build/generated/**")
    exclude("**/generated/**")
    exclude("**/build/generated/ksp/**")
    exclude("**/ksp/**")
    exclude("**/commonMainResourceAccessors/**")
    exclude("**/com/spresso/dataconnect/**")
    setSource(source.filter { !it.absolutePath.contains("/build/generated/") })
}
tasks.withType<dev.detekt.gradle.DetektCreateBaselineTask>().configureEach {
    jvmTarget = "17"
    exclude("**/build/generated/**")
    exclude("**/generated/**")
    exclude("**/build/generated/ksp/**")
    exclude("**/ksp/**")
    exclude("**/commonMainResourceAccessors/**")
    exclude("**/com/spresso/dataconnect/**")
    setSource(source.filter { !it.absolutePath.contains("/build/generated/") })
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
