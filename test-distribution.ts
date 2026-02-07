
import { PrismaClient, TransactionType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const Decimal = Prisma.Decimal;

// --- MOCKED calculateDirectSalesProfit (Copied Logic) ---
async function calculateDirectSalesProfit(campaignId: string) {
    try {
        console.log('[DIRECT SALES DEBUG] Starting calculation for campaign:', campaignId)

        const inventories = await prisma.directSalesInventory.findMany({
            where: { campaignId },
            include: {
                product: true,
                groupItems: {
                    include: {
                        group: {
                            include: {
                                volunteers: {
                                    include: {
                                        scout: true,
                                        user: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        console.log('[DIRECT SALES DEBUG] Found inventories:', inventories.length)

        // share structure: { scoutId, amount, groupDetails }
        const scoutShares: Record<string, any> = {}

        for (const inventory of inventories) {
            const product = inventory.product
            const profitPerUnit = new Decimal(product.ibaAmount || 0)

            console.log('[DIRECT SALES DEBUG] Product:', product?.name, 'Profit/Unit:', profitPerUnit.toString())

            for (const item of inventory.groupItems) {
                const group = item.group
                console.log('[DIRECT SALES DEBUG] Group:', group.name, 'Sold:', item.soldCount)

                if (item.soldCount === 0) continue

                // Calculate total profit for this item sales
                const itemProfit = profitPerUnit.times(item.soldCount)
                console.log('[DIRECT SALES DEBUG] Item profit:', itemProfit.toString())

                const scoutVolunteers = group.volunteers.filter((v: any) => v.scoutId !== null)
                console.log('[DIRECT SALES DEBUG] Scout volunteers:', scoutVolunteers.length)

                if (scoutVolunteers.length === 0) continue

                // Split profit equally among scout volunteers
                const profitPerScout = itemProfit.div(scoutVolunteers.length)

                for (const volunteer of scoutVolunteers) {
                    if (!volunteer.scoutId) continue

                    if (!scoutShares[volunteer.scoutId]) {
                        scoutShares[volunteer.scoutId] = {
                            scoutId: volunteer.scoutId,
                            amount: 0,
                            groupDetails: []
                        }
                    }

                    scoutShares[volunteer.scoutId].amount += profitPerScout.toNumber()
                    scoutShares[volunteer.scoutId].groupDetails.push(
                        `${group.name} (${product.name}): ${item.soldCount} sold`
                    )
                }
            }
        }

        // Fetch scout names
        const scoutIds = Object.keys(scoutShares)
        const scouts = await prisma.scout.findMany({
            where: { id: { in: scoutIds } },
            select: { id: true, name: true }
        })
        const scoutNameMap = new Map(scouts.map(s => [s.id, s.name]))

        return {
            success: true,
            shares: Object.values(scoutShares).map((share: any) => ({
                ...share,
                scoutName: scoutNameMap.get(share.scoutId) || "Unknown",
                amount: Math.round(share.amount * 100) / 100
            }))
        }
    } catch (error: any) {
        console.error("Error calculating direct sales profit:", error)
        return { error: "Failed to calculate profit" }
    }
}

// --- MOCKED calculateDistribution (Copied Logic) ---
async function calculateDistribution(campaignId: string) {
    const campaign = await prisma.fundraisingCampaign.findUnique({
        where: { id: campaignId },
        include: {
            transactions: true,
            sales: { include: { scout: true } },
            volunteers: { include: { scout: true } }
        }
    })

    if (!campaign) throw new Error("Campaign not found")

    // 1. Calculate Net Profit
    const donations = (campaign.transactions as any[])
        .filter(t => [TransactionType.DONATION_IN, TransactionType.FUNDRAISING_INCOME].includes(t.type))
        .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))

    const expenses = (campaign.transactions as any[])
        .filter(t => [TransactionType.EXPENSE, TransactionType.IBA_DEPOSIT].includes(t.type))
        .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))

    const orders = await prisma.fundraisingOrder.findMany({
        where: { campaignId },
        include: { product: true, scout: true }
    })

    const totalProductRevenue = orders.reduce((sum, order) => {
        return sum.plus(order.amountPaid || new Decimal(0))
    }, new Decimal(0))

    const totalProductCost = orders.reduce((sum, order) => {
        const cost = order.product?.cost || new Decimal(0)
        return sum.plus(cost.times(order.quantity))
    }, new Decimal(0))

    const totalProductProfit = totalProductRevenue.minus(totalProductCost)

    // Calculate direct sales revenue
    const directSalesInventories = await prisma.directSalesInventory.findMany({
        where: { campaignId },
        include: { product: true, groupItems: true }
    })

    let totalDirectSalesRevenue = new Decimal(0)
    for (const inventory of directSalesInventories) {
        const price = inventory.product?.price || new Decimal(0)
        // soldCount is now on items
        const totalSold = inventory.groupItems.reduce((sum, item) => sum + item.soldCount, 0)
        totalDirectSalesRevenue = totalDirectSalesRevenue.plus(price.times(totalSold))
    }

    const totalRevenue = totalProductRevenue.plus(donations).plus(totalDirectSalesRevenue)
    const netProfit = totalRevenue.minus(expenses)

    console.log('--- Calculation Breakdown ---')
    console.log('Product Revenue:', totalProductRevenue.toString())
    console.log('Direct Sales Revenue:', totalDirectSalesRevenue.toString())
    console.log('Donations:', donations.toString())
    console.log('Total Revenue:', totalRevenue.toString())
    console.log('Expenses:', expenses.toString())
    console.log('Net Profit:', netProfit.toString())

    if (netProfit.lte(0)) {
        console.log('Net Profit is <= 0. Returning empty shares.')
        return {
            netProfit: netProfit.toNumber(),
            ibaTotal: 0,
            volunteerTotal: 0,
            sellerTotal: 0,
            shares: []
        }
    }

    // 2. Splits
    const volunteerCount = (campaign as any).volunteers?.length || 0
    const ibaTotal = netProfit.times(new Decimal(campaign.ibaPercentage).div(100))
    const volunteerTotal = netProfit.times(((campaign as any).volunteerPercentage || new Decimal(0)).div(100))
    let sellerTotal = ibaTotal.minus(volunteerTotal)
    if (sellerTotal.isNegative()) sellerTotal = new Decimal(0)

    // 3. Distribution
    const shares: Record<string, any> = {} // Use any for simpler Decimal handling in this script
    let totalSellerShareFromProducts = new Decimal(0)
    let hasProductSpecificIBA = false

    orders.forEach(order => {
        if (order.product && order.product.ibaAmount.gt(0)) {
            totalSellerShareFromProducts = totalSellerShareFromProducts.plus(order.product.ibaAmount.times(order.quantity))
            hasProductSpecificIBA = true
        }
    })

    let finalIbaTotal = ibaTotal
    let finalSellerTotal = sellerTotal

    if (hasProductSpecificIBA) {
        const troopShareFromProducts = totalProductProfit.minus(totalSellerShareFromProducts)
        finalIbaTotal = troopShareFromProducts.gt(0) ? troopShareFromProducts : new Decimal(0)
        finalSellerTotal = totalSellerShareFromProducts

        orders.forEach(order => {
            const share = (order.product?.ibaAmount || new Decimal(0)).times(order.quantity)
            if (share.gt(0)) {
                shares[order.scoutId] = (shares[order.scoutId] || new Decimal(0)).plus(share)
            }
        })

        if (volunteerCount > 0) {
            const perVolunteer = volunteerTotal.div(volunteerCount)
                ; (campaign as any).volunteers.forEach((v: any) => {
                    shares[v.scoutId] = (shares[v.scoutId] || new Decimal(0)).plus(perVolunteer)
                })
        }
    } else {
        if (volunteerCount > 0) {
            const perVolunteer = volunteerTotal.div(volunteerCount)
                ; (campaign as any).volunteers.forEach((v: any) => {
                    shares[v.scoutId] = (shares[v.scoutId] || new Decimal(0)).plus(perVolunteer)
                })
        }
        const totalUnitsSold = orders.reduce((sum, o) => sum + o.quantity, 0)
        if (totalUnitsSold > 0) {
            const perUnit = sellerTotal.div(totalUnitsSold)
            orders.forEach(o => {
                const scoutShare = perUnit.times(o.quantity)
                shares[o.scoutId] = (shares[o.scoutId] || new Decimal(0)).plus(scoutShare)
            })
        }
    }

    const result = Object.entries(shares).map(([scoutId, amount]: [string, any]) => {
        const scout = orders.find(o => o.scoutId === scoutId)?.scout
            || (campaign as any).volunteers?.find((v: any) => v.scoutId === scoutId)?.scout
        return {
            scoutId,
            scoutName: (scout as any)?.name || "Unknown",
            amount: amount.toNumber()
        }
    })

    // Add direct sales profits
    try {
        // We call our MOCKED version here
        const directSalesResult = await calculateDirectSalesProfit(campaignId)
        console.log('Direct Sales Calculation Result:', JSON.stringify(directSalesResult, null, 2))

        if (directSalesResult.success && directSalesResult.shares) {
            for (const dsShare of directSalesResult.shares) {
                const existingShare = result.find(r => r.scoutId === dsShare.scoutId)
                if (existingShare) {
                    existingShare.amount += dsShare.amount
                } else {
                    result.push({
                        scoutId: dsShare.scoutId,
                        scoutName: dsShare.scoutName || "Unknown",
                        amount: dsShare.amount
                    })
                }
            }
        }
    } catch (error) {
        console.error("Error adding direct sales profit:", error)
    }

    return {
        netProfit: netProfit.toNumber(),
        ibaTotal: finalIbaTotal.toNumber(),
        volunteerTotal: volunteerTotal.toNumber(),
        sellerTotal: finalSellerTotal.toNumber(),
        shares: result
    }
}

// --- MAIN TEST ---
async function runTest() {
    try {
        const campaign = await prisma.fundraisingCampaign.findFirst({
            where: {
                type: 'PRODUCT_SALE',
                name: { contains: 'Popcorn' } // Corrected field name
            }
        });

        if (!campaign) {
            console.log('No campaign found');
            return;
        }

        console.log(`Running test for '${campaign.name}' (${campaign.id})`);
        const res = await calculateDistribution(campaign.id);
        console.log('--- FINAL RESULT ---');
        console.log(JSON.stringify(res, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
