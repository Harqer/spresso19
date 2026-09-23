import { httpAction } from "../_generated/server";

export const browserOrigins = [
  "https://get-spresso.web.app",
  "https://get-spresso.firebaseapp.com",
];

/** Origin checks supplement Firebase JWT verification; native clients have no Origin. */
export const browserHttpAction: typeof httpAction = (handler) =>
  httpAction((ctx, request) => {
    const origin = request.headers.get("Origin");
    if (origin !== null && !browserOrigins.includes(origin)) {
      return Promise.resolve(new Response(null, { status: 403 }));
    }
    return handler(ctx, request);
  });
