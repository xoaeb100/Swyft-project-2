import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DealType = 'consumer' | 'commercial';

export type DealStatus = 'uploaded' | 'parsed' | 'checked' | 'completed';

@Entity('deals')
export class Deal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'consumer',
  })
  type!: DealType;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'uploaded',
  })
  status!: DealStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
