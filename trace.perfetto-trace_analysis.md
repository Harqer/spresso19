# Trace Analysis Scratchpad
Trace File: /home/shaolin/Spresso/trace.perfetto-trace
Target Package: com.spresso19

## Chain of Evidence
- `com.spresso19` Process UPID: 77
- Main Thread UTID: 221, TID: 6418
- The main thread trace shows it was primarily in the "Running" state (13s total duration) and "Runnable" (6.9s total).
- The longest slice on the main thread is `Choreographer#doFrame 55988` taking **12.03 seconds**, which directly causes the ANR `Input dispatching timed out` (limit is 5s).
- Inside this doFrame, the massive delay is in `traversal` (11.87s).
- During this `traversal` (layout/measure/draw phase), the main thread is doing massive runtime class verification and loading:
  - `VerifyClass`: 2,126 occurrences, ~9.5s total duration.
  - `Class Loading`: 3,790 occurrences, ~3.58s total duration.
  - Examples of classes being verified: `com.google.android.gms.internal.firebase-auth-api.zzaci`, `androidx.compose.ui.platform.AndroidComposeView`, etc.
- There is also significant lock contention (614ms total) with the JIT thread (`tid: 6425`) and `ClassLinker` locks.
- **Root Cause Conclusion**: The ANR is caused by massive JIT compilation and Class Verification happening dynamically on the main thread. This indicates the application was running without Ahead-of-Time (AOT) compilation or Baseline Profiles, causing the Android Runtime (ART) to verify and compile thousands of Jetpack Compose and Firebase classes concurrently on the UI thread during the first frame.
