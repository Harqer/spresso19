# Zero Mock Data

- **No Mock, Placeholder, or Dummy Stubs**: Production paths must execute real queries.
- **No Fallback to Mock on Button/Action Failure**: If a backend call fails, you are strictly forbidden from falling back to dummy success states.
- **Production Failure Messaging**: Display concise, user-friendly notifications upon failure. Never output raw stack traces.
