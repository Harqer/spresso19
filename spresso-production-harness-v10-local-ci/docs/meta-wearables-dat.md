# Meta Wearables DAT Steering

Use the official installed Meta Wearables DAT plugin/SDK as the implementation source of truth. The recurring failure to prevent is partial integration caused by reading only the section named in the ticket.

Before DAT work:
1. identify the installed DAT version
2. inventory the complete plugin skill set
3. read every applicable `SKILL.md` completely
4. reconcile examples with the installed SDK types, changelog, current official docs/API, and samples
5. record every applicable pillar below in `PROGRESS.md` as verified, N/A with reason, or blocked with evidence

No pillar is implicitly out of scope:

- SDK/project/manifest initialization and release configuration
- Developer Mode vs production credentials
- registration/onboarding/unregistration and callback/deeplink return
- Android permissions and DAT permissions
- device discovery, `DeviceIdentifier`, metadata/type/name/link state
- device selection and active-device lifecycle
- compatibility, firmware, DAT-app update state
- device health/state exposed by the installed SDK, including thermal state when supported
- session lifecycle and async errors
- camera capability lifecycle
- stream configuration/state/frames/timestamps/codec-config/compression
- photo/video capture and capture errors
- Android audio/Bluetooth routing when audio is used
- display eligibility/lifecycle/content/input/video when supported
- disconnect/reconnect, fold/unfold, don/doff, permission revocation, competing experiences
- typed SDK errors and cleanup
- MockDeviceKit scenarios
- DAT Inspector/live debugging when available
- release/R8/background-service implications where applicable
- real supported-device verification

Do not invent APIs. If the installed SDK exposes a capability not represented above, add it to the applicability checklist before implementation.

Meta DAT stays in the Android platform boundary. Shared KMP code receives platform-neutral state/events/observations.
