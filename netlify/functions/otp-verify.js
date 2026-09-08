import { handler } from "../../lib/retired-otp.js";
export default async (request) => {
  const result = await handler({ httpMethod: request.method });
  return new Response(result.body, { status: result.statusCode, headers: result.headers });
};
