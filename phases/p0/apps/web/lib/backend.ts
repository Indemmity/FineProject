import { NextResponse } from "next/server";

const DEFAULT_HARVESTER_URL = "http://localhost:8001";
const DEFAULT_CLOSER_URL = "http://localhost:8002";

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getHarvesterBaseUrl(): string {
  return normalizeBaseUrl(process.env.HARVESTER_URL ?? DEFAULT_HARVESTER_URL);
}

export function getCloserBaseUrl(): string {
  return normalizeBaseUrl(process.env.CLOSER_URL ?? DEFAULT_CLOSER_URL);
}

export async function proxyJsonRequest(
  baseUrl: string,
  path: string,
  requestUrl: URL,
): Promise<NextResponse> {
  const targetUrl = new URL(path, normalizeBaseUrl(baseUrl));
  targetUrl.search = requestUrl.search;

  try {
    const upstream = await fetch(targetUrl.toString(), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const body = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "application/json; charset=utf-8";

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": contentType,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to proxy request";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function proxyJsonPost(
  baseUrl: string,
  path: string,
  searchParams: URLSearchParams,
): Promise<NextResponse> {
  const targetUrl = new URL(path, normalizeBaseUrl(baseUrl));
  targetUrl.search = searchParams.toString();

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const body = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "application/json; charset=utf-8";

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": contentType,
        "retry-after": upstream.headers.get("retry-after") ?? "",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to proxy request";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
