import { WebhookProvider } from "./types";

import crypto from "crypto";

export class GitHubProvider implements WebhookProvider {

  providerId = "github";

  async verify(body: any, headers: any, secret: string): Promise<boolean> {
    
    const signature= headers["x-hub-signature-256"];

    if(!signature || typeof signature !== "string") return false;

    const hmac= crypto.createHmac("sha256", secret);
    hmac.update(JSON.stringify(body));

    const calculated = `sha256=${hmac.digest("hex")}`;

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculated)
    );
  }
}
