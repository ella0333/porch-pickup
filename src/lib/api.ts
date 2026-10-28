import { NextResponse } from "next/server";
import { HttpError } from "./auth";

// Wraps a route handler so thrown HttpErrors become JSON error responses.
export function route<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  return async (...args: A) => {
    try {
      const result = await fn(...args);
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      const message = err instanceof Error ? err.message : "Something went wrong.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
