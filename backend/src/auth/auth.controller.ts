import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  getMe(@Req() request: Request) {
    const user = request.user;

    return {
      id: user?.uid,
      email: user?.email ?? null,
      name: user?.name ?? null,
    };
  }

  @Post('google/exchange')
  exchangeGoogleCode(
    @Body()
    body: {
      code: string;
      codeVerifier: string;
      redirectUri: string;
    },
  ) {
    return this.authService.exchangeGoogleCode(
      body.code,
      body.codeVerifier,
      body.redirectUri,
    );
  }
}
