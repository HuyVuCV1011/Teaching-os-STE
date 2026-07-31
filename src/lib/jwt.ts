const encoder = new TextEncoder();

function base64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(str: string): Uint8Array {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) {
    s += "=";
  }
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export type JWTPayload = Record<string, unknown>;

type SignJWTOptions = {
  expiresInSeconds?: number
}

const CLOCK_TOLERANCE_SECONDS = 30

export async function signJWT<TPayload extends object>(
  payload: TPayload,
  secret: string,
  options: SignJWTOptions = {},
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000)
  const payloadWithClaims = options.expiresInSeconds
    ? {
        ...payload,
        iat: now,
        exp: now + options.expiresInSeconds,
      }
    : payload

  const encodedHeader = base64url(encoder.encode(JSON.stringify(header)));
  const encodedPayload = base64url(encoder.encode(JSON.stringify(payloadWithClaims)));
  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, data);
  const encodedSignature = base64url(new Uint8Array(signature));

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export async function verifyJWT<TPayload extends object = Record<string, string>>(
  token: string,
  secret: string
): Promise<TPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signatureBytes = base64urlDecode(encodedSignature);
  const isValid = await crypto.subtle.verify("HMAC", key, signatureBytes, data);

  if (!isValid) {
    return null;
  }

  try {
    const payloadStr = new TextDecoder().decode(base64urlDecode(encodedPayload));
    const parsed = JSON.parse(payloadStr);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.exp === "number" &&
      Math.floor(Date.now() / 1000) > parsed.exp + CLOCK_TOLERANCE_SECONDS
    ) {
      return null
    }

    return parsed && typeof parsed === "object" ? parsed as TPayload : null;
  } catch {
    return null;
  }
}
