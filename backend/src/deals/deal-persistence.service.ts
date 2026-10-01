import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Deal } from './deal.entity';
import { Statement } from './statement.entity';
import { Account } from './account.entity';
import { Transaction } from './transaction.entity';
import { StorageService } from 'src/storage/storage.service';

type ParsedTransactionInput = {
  date: string;
  description: string;
  amount: number;
  balance: number | null;
  type: string | null;
  originalTags: Record<string, string>[];
};

type ParsedAccountInput = {
  bankName: string;
  accountHolder: string;
  accountType: string;
  bsb: string;
  accountNumber: string;
  currentBalance: number | null;
  availableBalance: number | null;
  transactions: ParsedTransactionInput[];
};

type ParsedStatementInput = {
  format: 'json' | 'html';
  reference: string | null;
  submissionTime: string | null;
  accounts: ParsedAccountInput[];
};

@Injectable()
export class DealPersistenceService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,

    @InjectRepository(Statement)
    private readonly statementRepository: Repository<Statement>,

    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,

    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,

    private readonly storageService: StorageService,
  ) {}

  async saveStatement(
    userId: string,
    dealId: string,
    input: ParsedStatementInput,
    sourceFileName?: string,
    sourceFileContent?: string,
  ) {
    let storagePath: string | null = null;

    if (sourceFileName && sourceFileContent) {
      storagePath = await this.storageService.uploadStatement(
        userId,
        dealId,
        sourceFileName,
        sourceFileContent,
      );
    }
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SELECT set_config('app.current_user_id', $1, true)`,
        [userId],
      );

      const deal = await manager.findOne(Deal, {
        where: {
          id: dealId,
          userId,
        },
      });

      if (!deal) {
        throw new NotFoundException('Deal not found');
      }

      const statement = manager.create(Statement, {
        dealId,
        userId,
        format: input.format,
        reference: input.reference,
        submissionTime: input.submissionTime,
        sourceFileName: sourceFileName ?? null,
        storagePath,
      });

      const savedStatement = await manager.save(Statement, statement);

      const savedAccounts = [];

      for (const accountInput of input.accounts) {
        const account = manager.create(Account, {
          statementId: savedStatement.id,
          dealId,
          userId,
          bankName: accountInput.bankName,
          accountHolder: accountInput.accountHolder,
          accountType: accountInput.accountType,
          bsb: accountInput.bsb,
          accountNumber: accountInput.accountNumber,
          currentBalance: accountInput.currentBalance,
          availableBalance: accountInput.availableBalance,
        });

        const savedAccount = await manager.save(Account, account);

        const transactions = accountInput.transactions.map((transactionInput) =>
          manager.create(Transaction, {
            accountId: savedAccount.id,
            dealId,
            userId,
            date: transactionInput.date,
            description: transactionInput.description,
            amount: transactionInput.amount,
            balance: transactionInput.balance,
            type: transactionInput.type,
            originalTags: transactionInput.originalTags,
            tag: null,
            annotation: null,
          }),
        );

        const savedTransactions = await manager.save(Transaction, transactions);

        savedAccounts.push({
          id: savedAccount.id,
          transactionCount: savedTransactions.length,
          transactionIds: savedTransactions.map(
            (transaction) => transaction.id,
          ),
        });
      }

      deal.status = 'parsed';
      await manager.save(Deal, deal);

      return {
        statementId: savedStatement.id,
        dealId,
        accountCount: savedAccounts.length,
        accounts: savedAccounts,
      };
    });
  }

  async findOne(userId: string, dealId: string) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SELECT set_config('app.current_user_id', $1, true)`,
        [userId],
      );

      const deal = await manager.findOne(Deal, {
        where: {
          id: dealId,
          userId,
        },
      });

      if (!deal) {
        throw new NotFoundException('Deal not found');
      }

      const statements = await manager.find(Statement, {
        where: {
          dealId,
          userId,
        },
        order: {
          createdAt: 'ASC',
        },
      });

      const statementResults = [];

      for (const statement of statements) {
        const accounts = await manager.find(Account, {
          where: {
            statementId: statement.id,
            dealId,
            userId,
          },
          order: {
            createdAt: 'ASC',
          },
        });

        const accountResults = [];

        for (const account of accounts) {
          const transactions = await manager.find(Transaction, {
            where: {
              accountId: account.id,
              dealId,
              userId,
            },
            order: {
              date: 'ASC',
              createdAt: 'ASC',
            },
          });

          accountResults.push({
            ...account,
            transactions,
          });
        }

        statementResults.push({
          ...statement,
          accounts: accountResults,
        });
      }

      return {
        ...deal,
        statements: statementResults,
      };
    });
  }

  async updateTransaction(
    userId: string,
    dealId: string,
    transactionId: string,
    input: {
      tag?: string | null;
      annotation?: string | null;
    },
  ) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SELECT set_config('app.current_user_id', $1, true)`,
        [userId],
      );

      const transaction = await manager.findOne(Transaction, {
        where: {
          id: transactionId,
          dealId,
          userId,
        },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      if (input.tag !== undefined) {
        transaction.tag = input.tag;
      }

      if (input.annotation !== undefined) {
        transaction.annotation = input.annotation;
      }

      return manager.save(Transaction, transaction);
    });
  }
}
