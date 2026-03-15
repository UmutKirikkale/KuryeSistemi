const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

const parseSettlementDescription = (description) => {
  const text = description || '';
  const courierMatch = text.match(/courier:([^|]+)/);
  const dayMatch = text.match(/date:([^|]+)/);
  const restaurantMatch = text.match(/restaurant:([^|]+)/);

  return {
    courierId: courierMatch ? courierMatch[1] : null,
    dayKey: dayMatch ? dayMatch[1] : null,
    restaurantIdFromDescription: restaurantMatch ? restaurantMatch[1] : null
  };
};

const getDayRangeFromKey = (dayKey) => {
  const start = new Date(dayKey);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const calculateCashOnlySettlement = async ({ courierId, restaurantId, dayKey }) => {
  const range = getDayRangeFromKey(dayKey);
  if (!range) {
    return null;
  }

  const orders = await prisma.order.findMany({
    where: {
      courierId,
      restaurantId,
      status: 'DELIVERED',
      deliveredAt: {
        gte: range.start,
        lte: range.end
      },
      OR: [{ paymentMethod: 'CASH' }, { paymentMethod: null }]
    },
    select: {
      orderAmount: true,
      commissionAmount: true,
      courierFee: true
    }
  });

  const packages = orders.length;
  const amount = orders.reduce((sum, order) => {
    const orderAmount = Number(order.orderAmount || 0);
    const commission = Number(order.commissionAmount || 0);
    const courierFee = Number(order.courierFee || 0);
    return sum + (orderAmount - commission - courierFee);
  }, 0);

  return {
    packages,
    amount
  };
};

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Define DATABASE_URL before running this backfill script.');
  }

  const applyMode = process.argv.includes('--apply');

  const settlements = await prisma.financialTransaction.findMany({
    where: {
      transactionType: 'COURIER_SETTLEMENT'
    },
    select: {
      id: true,
      amount: true,
      date: true,
      description: true,
      restaurantId: true
    },
    orderBy: { date: 'asc' }
  });

  const plan = [];

  for (const tx of settlements) {
    const parsed = parseSettlementDescription(tx.description);
    const courierId = parsed.courierId;
    const dayKey = parsed.dayKey;
    const restaurantId = tx.restaurantId || parsed.restaurantIdFromDescription;

    if (!courierId || !dayKey || !restaurantId) {
      plan.push({
        id: tx.id,
        action: 'skip',
        reason: 'missing_keys_in_description_or_restaurant'
      });
      continue;
    }

    const calculated = await calculateCashOnlySettlement({
      courierId,
      restaurantId,
      dayKey
    });

    if (!calculated) {
      plan.push({
        id: tx.id,
        action: 'skip',
        reason: 'invalid_day_key',
        dayKey
      });
      continue;
    }

    const newDescription = `courier:${courierId}|date:${dayKey}|restaurant:${restaurantId}|packages:${calculated.packages}`;

    if (calculated.packages <= 0 || calculated.amount <= 0) {
      plan.push({
        id: tx.id,
        action: 'delete',
        oldAmount: tx.amount,
        newAmount: 0,
        oldDescription: tx.description,
        newDescription
      });
      continue;
    }

    const roundedAmount = Number(calculated.amount.toFixed(2));
    const amountChanged = Number(tx.amount.toFixed(2)) !== roundedAmount;
    const descriptionChanged = (tx.description || '') !== newDescription;

    if (!amountChanged && !descriptionChanged) {
      plan.push({
        id: tx.id,
        action: 'unchanged',
        amount: roundedAmount
      });
      continue;
    }

    plan.push({
      id: tx.id,
      action: 'update',
      oldAmount: tx.amount,
      newAmount: roundedAmount,
      oldDescription: tx.description,
      newDescription
    });
  }

  const summary = {
    total: plan.length,
    update: plan.filter((p) => p.action === 'update').length,
    delete: plan.filter((p) => p.action === 'delete').length,
    unchanged: plan.filter((p) => p.action === 'unchanged').length,
    skip: plan.filter((p) => p.action === 'skip').length,
    mode: applyMode ? 'apply' : 'dry-run'
  };

  console.log('SETTLEMENT_BACKFILL_SUMMARY', summary);

  if (!applyMode) {
    console.log('DRY_RUN_ONLY. Re-run with --apply to persist changes.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const item of plan) {
      if (item.action === 'update') {
        await tx.financialTransaction.update({
          where: { id: item.id },
          data: {
            amount: item.newAmount,
            description: item.newDescription
          }
        });
      }

      if (item.action === 'delete') {
        await tx.financialTransaction.delete({
          where: { id: item.id }
        });
      }
    }
  });

  console.log('SETTLEMENT_BACKFILL_APPLIED', {
    updated: summary.update,
    deleted: summary.delete
  });
}

main()
  .catch((error) => {
    console.error('SETTLEMENT_BACKFILL_FAILED');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
