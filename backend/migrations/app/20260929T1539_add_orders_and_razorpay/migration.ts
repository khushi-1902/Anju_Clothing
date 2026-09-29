#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7d944574500b879bec801cb46b1e0c5daca3eaffdc0d298537963acfde8969e5/contract';
import startContract from '../../snapshots/7d944574500b879bec801cb46b1e0c5daca3eaffdc0d298537963acfde8969e5/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c17c8200d9429fc3872301bc5888560f21bea44cb8ce0113b9175a08fa5e9df9/contract';
import endContract from '../../snapshots/c17c8200d9429fc3872301bc5888560f21bea44cb8ce0113b9175a08fa5e9df9/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'order_items',
        columns: [
          col('color', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('imageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('orderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('price', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('productId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('productVariantId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('size', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'order_items_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'orders',
        columns: [
          col('clerkUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('courierName', 'text', {
            default: lit('BlueDart Express'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('customerEmail', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('customerName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('customerPhone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('discountAmount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('estimatedDelivery', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('items', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('orderNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('orderStatus', 'text', {
            notNull: true,
            default: lit('Confirmed'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('paymentMethod', 'text', {
            notNull: true,
            default: lit('COD'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('paymentStatus', 'text', {
            notNull: true,
            default: lit('Pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('razorpayOrderId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('razorpayPaymentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('shippingAddress', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('shippingFee', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('subtotal', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('timeline', 'jsonb', {
            notNull: true,
            default: lit([]),
            codecRef: { codecId: 'pg/jsonb@1' },
          }),
          col('totalAmount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('trackingNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'orders_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'product_reviews',
        columns: [
          col('comment', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('helpfulCount', 'int4', { default: lit(0), codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('productId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('rating', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('title', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('verified', 'bool', { default: lit(true), codecRef: { codecId: 'pg/bool@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'product_reviews_pkey' }),
          checkExpression('product_reviews_rating_check', '((rating >= 1) AND (rating <= 5))'),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'store_settings',
        columns: [
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('value', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['key'], { name: 'store_settings_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'users',
        columns: [
          col('clerkUserId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('clerk_user_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('created_at', 'timestamptz', {
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('imageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('CUSTOMER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('updated_at', 'timestamptz', {
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'users_pkey' })],
      }),
      this.addUnique({
        schema: 'public',
        table: 'orders',
        constraint: 'orders_orderNumber_key',
        columns: ['orderNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'orders',
        constraint: 'orders_razorpayOrderId_key',
        columns: ['razorpayOrderId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_clerkUserId_key',
        columns: ['clerkUserId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_clerk_user_id_key',
        columns: ['clerk_user_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_items',
        index: 'idx_order_items_order_id',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orders',
        index: 'idx_orders_email',
        columns: ['customerEmail'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orders',
        index: 'idx_orders_order_number',
        columns: ['orderNumber'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orders',
        index: 'idx_orders_razorpay_order_id',
        columns: ['razorpayOrderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orders',
        index: 'idx_orders_user_id',
        columns: ['clerkUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_reviews',
        index: 'idx_product_reviews_product_id',
        columns: ['productId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'products',
        index: 'idx_products_bestseller_created',
        columns: ['isBestseller', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'products',
        index: 'idx_products_sale_created',
        columns: ['isSale', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'users',
        index: 'idx_users_clerk_id',
        columns: ['clerk_user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'users',
        index: 'idx_users_clerk_user_id',
        columns: ['clerkUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'users',
        index: 'idx_users_email',
        columns: ['email'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_items',
        foreignKey: {
          name: 'order_items_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'orders', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_items',
        foreignKey: {
          name: 'order_items_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'products', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_items',
        foreignKey: {
          name: 'order_items_productVariantId_fkey',
          columns: ['productVariantId'],
          references: { schema: 'public', table: 'product_variants', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'orders',
        foreignKey: {
          name: 'orders_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_reviews',
        foreignKey: {
          name: 'product_reviews_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'products', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
