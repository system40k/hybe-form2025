export const handler = async (event) => ({
  statusCode: event.httpMethod === "POST" ? 410 : 405,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify({ success: false, error: "Please reload the page to use Supabase email sign-in." }),
});
