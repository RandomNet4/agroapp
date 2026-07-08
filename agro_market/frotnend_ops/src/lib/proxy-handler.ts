import { NextRequest, NextResponse } from "next/server";

import { serverConfig } from "./config";

export async function handleProxyRequest(request: NextRequest, slug: string[]) {
  const apiUrl = serverConfig.apiUrl;
  const apiKey = serverConfig.apiKey;

  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      {
        error: "Server proxy configuration is missing",
        details: { apiUrl: !!apiUrl, apiKey: !!apiKey },
      },
      { status: 500 },
    );
  }

  const targetPath = slug ? slug.join("/") : "";

  // Intercept the logout route on the Next.js side, but call the backend logout first to log the activity
  if (targetPath === "auth/logout") {
    const tokenCookie = request.cookies.get("accessToken");
    try {
      const backendHeaders = new Headers();
      backendHeaders.set("x-api-key", apiKey);
      if (tokenCookie?.value) {
        backendHeaders.set("Authorization", `Bearer ${tokenCookie.value}`);
      }
      const userAgent = request.headers.get("user-agent");
      if (userAgent) {
        backendHeaders.set("user-agent", userAgent);
      }

      await fetch(`${apiUrl}/auth/logout`, {
        method: "POST",
        headers: backendHeaders,
        cache: "no-store",
      });
    } catch (err) {
      console.error("[PROXY] Failed to notify backend of logout:", err);
    }

    const res = NextResponse.json({ success: true, message: "Logged out" });
    res.cookies.delete("accessToken");
    return res;
  }

  const searchParams = request.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : "";
  const targetUrl = `${apiUrl}/${targetPath}${queryString}`;

  const headers = new Headers();
  headers.set("x-api-key", apiKey);
  const contentType = request.headers.get("Content-Type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  } else if (request.method !== "GET" && request.method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }

  // Automatically attach the HttpOnly cookie's token into the Authorization header
  const tokenCookie = request.cookies.get("accessToken");
  console.log("[PROXY] Path:", targetPath);
  console.log("[PROXY] Extracted accessToken cookie:", !!tokenCookie?.value);
  if (tokenCookie?.value) {
    headers.set("Authorization", `Bearer ${tokenCookie.value}`);
  } else {
    // Fallback just in case the Next.js client request manually attached an auth header
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers.set("Authorization", authHeader);
    }
  }

  let body = undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store", // Disable Next.js data caching for proxy
    });

    // Support for Server-Sent Events (SSE) streaming
    const contentType =
      response.headers.get("Content-Type") || "application/json";
    const isStreamPath =
      targetPath.includes("/stream") || targetPath.endsWith("/stream");

    console.log(
      `[PROXY] Response Path: ${targetPath}, Status: ${response.status}, Content-Type: ${contentType}, isStreamPath: ${isStreamPath}`,
    );

    if (
      (contentType.includes("text/event-stream") || isStreamPath) &&
      response.body
    ) {
      console.log(`[PROXY] Streaming SSE response for ${targetPath}`);
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Pragma: "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // Handle binary responses to prevent UTF-8 decoding corruption (like Excel, images, etc.)
    const isBinary =
      contentType.includes("spreadsheetml") ||
      contentType.includes("excel") ||
      contentType.includes("octet-stream") ||
      contentType.includes("image/") ||
      contentType.includes("pdf");

    if (isBinary) {
      console.log(`[PROXY] Handling binary response for ${targetPath}`);
      const arrayBuffer = await response.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        status: response.status,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition":
            response.headers.get("Content-Disposition") || "",
          "Content-Length": response.headers.get("Content-Length") || "",
        },
      });
    }

    const dataText = await response.text();

    // Create the standard Next.js response passing through the backend's status
    const proxyResponse = new NextResponse(dataText, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
      },
    });

    // Intercept successful login/register to save the JWT token into a secure cookie
    if (
      response.ok &&
      (targetPath === "auth/login" || targetPath.startsWith("auth/register"))
    ) {
      try {
        const jsonData = JSON.parse(dataText);
        const token = jsonData.data?.accessToken || jsonData.accessToken;
        if (token) {
          proxyResponse.cookies.set({
            name: "accessToken",
            value: token,
            httpOnly: true,
            secure: serverConfig.isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60, // 7 days matching JWT expiration
          });
        }
      } catch (err) {
        console.error("Failed to parse auth response for cookies", err);
      }
    }

    return proxyResponse;
  } catch (error) {
    console.error("API Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy request to backend API" },
      { status: 502 },
    );
  }
}
