import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

export const AIRDROP_RESULT_INIT = 0;
export const AIRDROP_RESULT_PENDING = 1;
export const AIRDROP_RESULT_PROCESSING = 2;
export const AIRDROP_RESULT_SUCCESS = 3;
export const AIRDROP_RESULT_FAILED = 4;

@Entity({ engine: "InnoDB" })
@Unique("uni_receiver", ["requestId", "receiver"])
export class AirdropResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  requestId: number;

  @Column({ nullable: false })
  receiver: string;

  @Column({ type: "tinyint", default: AIRDROP_RESULT_INIT })
  status: number;

  @Column({ default: "" })
  txHash: string;

  @Column({ type: "text" })
  errorMsg: string;

  @Column()
  createAt: Date;

  @Column()
  updateAt: Date;
}
