import type { NextRequest } from "next/server";
import { middleware as loginMiddleware } from "./middleware/login.js";


export function middleware(request: NextRequest) {
	return loginMiddleware(request);
}

export const config = {
	matcher: ["/", "/((?!_next|api|login|static).*)"],
};
