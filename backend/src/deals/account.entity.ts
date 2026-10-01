import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'statement_id', type: 'uuid' })
  statementId!: string;

  @Column({ name: 'deal_id', type: 'uuid' })
  dealId!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId!: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 255 })
  bankName!: string;

  @Column({ name: 'account_holder', type: 'varchar', length: 255 })
  accountHolder!: string;

  @Column({ name: 'account_type', type: 'varchar', length: 100 })
  accountType!: string;

  @Column({ type: 'varchar', length: 50 })
  bsb!: string;

  @Column({ name: 'account_number', type: 'varchar', length: 100 })
  accountNumber!: string;

  @Column({ name: 'current_balance', type: 'numeric', nullable: true })
  currentBalance!: number | null;

  @Column({ name: 'available_balance', type: 'numeric', nullable: true })
  availableBalance!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
