#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7d944574500b879bec801cb46b1e0c5daca3eaffdc0d298537963acfde8969e5/contract';
import endContract from '../../snapshots/7d944574500b879bec801cb46b1e0c5daca3eaffdc0d298537963acfde8969e5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'product_images',
        columns: [
          col('alt', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('position', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('productId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'product_variants',
        columns: [
          col('color', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('compareAtPrice', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('imageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('price', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('productId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('size', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sku', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('stock', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'products',
        columns: [
          col('category', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('comparePrice', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('descriptionHtml', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fabric', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('handle', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isBestseller', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('isNewArrival', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('isSale', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('price', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('work', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'products',
        constraint: 'products_handle_key',
        columns: ['handle'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_images',
        index: 'product_images_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_variants',
        index: 'product_variants_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_images',
        foreignKey: {
          name: 'product_images_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'products', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_variants',
        foreignKey: {
          name: 'product_variants_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'products', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
