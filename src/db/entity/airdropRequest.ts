import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

export const AIRDROP_REQUEST_INIT = 0;
export const AIRDROP_REQUEST_PENDING = 1;
export const AIRDROP_REQUEST_PROCESSING = 2;
export const AIRDROP_REQUEST_COMPLETED = 3;
export const AIRDROP_REQUEST_CANCELED = 4;

@Entity({ engine: "InnoDB" })
export class AirdropRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  campaignId: number;

  @Column()
  chain: string;

  @Column({ type: "tinyint", default: AIRDROP_REQUEST_INIT })
  status: number;

  @Column()
  contractAddress: string;

  @Column()
  startTime: Date;

  @Column()
  createAt: Date;

  @Column()
  updateAt: Date;
}
