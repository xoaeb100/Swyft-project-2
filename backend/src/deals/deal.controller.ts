import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
  Get,
  Patch,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { DealService } from './deal.service';
import { DealType } from './deal.entity';
import { DealPersistenceService } from './deal-persistence.service';

@Controller('deals')
@UseGuards(FirebaseAuthGuard)
export class DealController {
  constructor(
    private readonly dealService: DealService,
    private readonly dealPersistenceService: DealPersistenceService,
  ) {}

  @Post()
  async create(@Req() request: any, @Body() body: { type?: DealType }) {
    const userId = request.user.uid;

    return this.dealService.create(userId, body.type ?? 'consumer');
  }
  @Post(':dealId/statements')
  async saveStatement(
    @Req() request: any,
    @Param('dealId') dealId: string,
    @Body() body: any,
  ) {
    return this.dealPersistenceService.saveStatement(
      request.user.uid,
      dealId,
      body,
      body.sourceFileName,
      body.sourceFileContent,
    );
  }

  @Get()
  async findAll(@Req() request: any) {
    return this.dealService.findAll(request.user.uid);
  }

  @Get(':dealId')
  async findOne(@Req() request: any, @Param('dealId') dealId: string) {
    return this.dealPersistenceService.findOne(request.user.uid, dealId);
  }
  @Patch(':dealId/transactions/:transactionId')
  async updateTransaction(
    @Req() request: any,
    @Param('dealId') dealId: string,
    @Param('transactionId') transactionId: string,
    @Body()
    body: {
      tag?: string | null;
      annotation?: string | null;
    },
  ) {
    return this.dealPersistenceService.updateTransaction(
      request.user.uid,
      dealId,
      transactionId,
      body,
    );
  }
  @Patch(':dealId')
  async update(
    @Req() request: any,
    @Param('dealId') dealId: string,
    @Body()
    body: {
      type?: DealType;
      status?: 'uploaded' | 'parsed' | 'checked' | 'completed';
    },
  ) {
    return this.dealService.update(request.user.uid, dealId, body);
  }
}
