import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Deal, DealStatus, DealType } from './deal.entity';

@Injectable()
export class DealService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,
  ) {}

  async create(userId: string, type: DealType = 'consumer'): Promise<Deal> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SELECT set_config('app.current_user_id', $1, true)`,
        [userId],
      );

      const deal = manager.create(Deal, {
        userId,
        type,
        status: 'uploaded',
        name: null,
      });

      return manager.save(Deal, deal);
    });
  }

  async findAll(userId: string): Promise<Deal[]> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SELECT set_config('app.current_user_id', $1, true)`,
        [userId],
      );

      return manager.find(Deal, {
        where: {
          userId,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    });
  }

  async update(
    userId: string,
    dealId: string,
    input: {
      type?: DealType;
      status?: DealStatus;
    },
  ): Promise<Deal> {
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
        throw new Error('Deal not found');
      }

      if (input.type !== undefined) {
        deal.type = input.type;
      }

      if (input.status !== undefined) {
        deal.status = input.status;
      }

      return manager.save(Deal, deal);
    });
  }
}
