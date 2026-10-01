import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { firebaseAuth } from './firebase-admin';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization token');
    }

    const idToken = authorization.substring('Bearer '.length).trim();

    if (!idToken) {
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      const decodedToken = await firebaseAuth.verifyIdToken(idToken);

      request.user = decodedToken;

      return true;
    } catch (error) {
      console.error('Firebase token verification failed:', error);

      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }
  }
}
