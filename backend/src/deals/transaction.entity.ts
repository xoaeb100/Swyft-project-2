import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  @Column({ name: 'deal_id', type: 'uuid' })
  dealId!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'numeric' })
  amount!: number;

  @Column({ type: 'numeric', nullable: true })
  balance!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type!: string | null;

  @Column({ name: 'original_tags', type: 'jsonb', default: () => "'[]'" })
  originalTags!: Record<string, string>[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  tag!: string | null;

  @Column({ type: 'text', nullable: true })
  annotation!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
