# Platform Priority & Navigation

- **Android First**: Although Spresso is built as a Compose Multiplatform (`composeApp`) project, the user explicitly prioritizes the Android target ("android app first not kmp first... android app is actually the most important app"). 
- **Navigation Architecture**: The current hand-rolled `NavBackStack.kt` KMP implementation is over-engineered. The goal is to replace it with native `androidx.navigation3.runtime.NavHost`. Since this library is Android-only, this will require either moving the core `App` entry point to `androidMain` or introducing `expect/actual` wrappers for navigation.
- **Zero-Mock Policy**: Strict enforcement of throwing `IllegalStateException` on missing backend routes or unimplemented click handlers, rather than using temporary `AlertDialog`s or "coming soon" snackbars.
