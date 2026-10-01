import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deal } from './deal.entity';
import { Statement } from './statement.entity';
import { Account } from './account.entity';
import { Transaction } from './transaction.entity';
import { DealController } from './deal.controller';
import { DealService } from './deal.service';
import { DealPersistenceService } from './deal-persistence.service';
import { StorageService } from 'src/storage/storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Deal, Statement, Account, Transaction])],
  controllers: [DealController],
  providers: [DealService, DealPersistenceService, StorageService],
})
export class DealModule {}
