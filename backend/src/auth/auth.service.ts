import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class AuthService {
  async exchangeGoogleCode(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Google OAuth configuration is missing',
      );
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Google token exchange failed: ${await response.text()}`,
      );
    }

    return response.json();
  }
}
