#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/37663cdcf2e51f123bbb69b7cc6d65d36f8911d350b873a9d68885eff72a087e/contract';
import endContract from '../../snapshots/37663cdcf2e51f123bbb69b7cc6d65d36f8911d350b873a9d68885eff72a087e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c17c8200d9429fc3872301bc5888560f21bea44cb8ce0113b9175a08fa5e9df9/contract';
import startContract from '../../snapshots/c17c8200d9429fc3872301bc5888560f21bea44cb8ce0113b9175a08fa5e9df9/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'orders',
        column: col('amountDueOnDelivery', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'orders',
        column: col('amountPayableNow', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
