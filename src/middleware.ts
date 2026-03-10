import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Example middleware: Log the request method and URL
  console.log(`${req.method} ${req.url}`);

  // You can add more middleware logic here, such as authentication checks

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'], // Apply this middleware to API routes
};