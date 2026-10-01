import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { Deal } from './deals/deal.entity';
import { Statement } from './deals/statement.entity';
import { Account } from './deals/account.entity';
import { Transaction } from './deals/transaction.entity';
import { DealModule } from './deals/deal.module';
import { StorageService } from './storage/storage.service';
@Module({
  //
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const password = configService.get<string>('DB_PASSWORD') ?? '';
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password,
          database: configService.get<string>('DB_DATABASE'),

          autoLoadEntities: true,
          entities: [Deal, Statement, Account, Transaction],

          synchronize: false,
        };
      },
    }),
    AuthModule,
    DealModule,
  ],
  providers: [StorageService],
})
export class AppModule {}
