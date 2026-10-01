import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('statements')
export class Statement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'deal_id', type: 'uuid' })
  dealId!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId!: string;

  @Column({ type: 'varchar', length: 20 })
  format!: 'json' | 'html';

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference!: string | null;

  @Column({
    name: 'submission_time',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  submissionTime!: string | null;

  @Column({
    name: 'source_file_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  sourceFileName!: string | null;

  @Column({
    name: 'storage_path',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  storagePath!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
