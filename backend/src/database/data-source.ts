import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Deal } from '../deals/deal.entity';
import { CreateDeals20260929110000 } from './migrations/20260929110000-create-deals';
import 'dotenv/config';
import { AddStatementStorage1790669508200 } from './migrations/1790669508200-20260929140000-add-statement-storage';
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [Deal],
  migrations: [CreateDeals20260929110000, AddStatementStorage1790669508200],
});
