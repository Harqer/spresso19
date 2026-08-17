sed -i '/androidMain.dependencies {/a\            implementation(libs.androidx.navigation3.ui)\n            implementation(libs.androidx.navigation3.runtime)' composeApp/build.gradle.kts
sed -i '/commonMain.dependencies {/a\            implementation(libs.material3.adaptive.navigation.suite)' composeApp/build.gradle.kts
