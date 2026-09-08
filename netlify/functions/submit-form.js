import { handler } from "../../lib/submit-form.js";
export default async (request) => {
  const result = await handler({ httpMethod: request.method,
    headers: Object.fromEntries(request.headers), body: await request.text() });
  return new Response(result.body, { status: result.statusCode, headers: result.headers });
};
