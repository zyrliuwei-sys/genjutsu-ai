/**
 * Redirects and fetched responses can have read-only headers. Re-wrap the
 * response before adding application headers or cookies, retaining its stream.
 * Response.clone() keeps the original header guard and does not fix this.
 */
export function mutableResponse(response: Response): Response {
  return new Response(response.body, response);
}
