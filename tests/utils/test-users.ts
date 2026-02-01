import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// TODO: Comprehensive refactor needed for multi-tenant architecture
// Test users now need TroopMember records for roles, not global User.role
// Scouts now require troopId field
// This entire test utility needs redesign for per-troop roles

export const TEST_USERS = {
    ADMIN: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@test.trooptreasury.com',
        password: 'TestAdmin123!@#',
        name: 'Test Admin',
        role: 'ADMIN' as const, // TODO: Create TroopMember with this role
    },
    FINANCIER: {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'financier@test.trooptreasury.com',
        password: 'TestFinancier123!@#',
        name: 'Test Financier',
        role: 'FINANCIER' as const, // TODO: Create TroopMember with this role
    },
    LEADER: {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'leader@test.trooptreasury.com',
        password: 'TestLeader123!@#',
        name: 'Test Leader',
        role: 'LEADER' as const, // TODO: Create TroopMember with this role
    },
    PARENT: {
        id: '00000000-0000-0000-0000-000000000004',
        email: 'parent@test.trooptreasury.com',
        password: 'TestParent123!@#',
        name: 'Test Parent',
        role: 'PARENT' as const, // TODO: Create TroopMember with this role
    },
    SCOUT: {
        id: '00000000-0000-0000-0000-000000000005',
        email: 'scout@test.trooptreasury.com',
        password: 'TestScout123!@#',
        name: 'Test Scout User',
        role: 'SCOUT' as const, // TODO: Create TroopMember with this role
    },
    INACTIVE_USER: {
        id: '00000000-0000-0000-0000-000000000006',
        email: 'inactive@test.trooptreasury.com',
        password: 'TestInactive123!@#',
        name: 'Inactive User',
        role: 'PARENT' as const, // TODO: Create TroopMember with this role
        isActive: false,
    },
};

/**
 * Seed test users in the database
 * TODO: Refactor for multi-tenant architecture - need troopId for scouts, TroopMember for roles
 */
export async function seedTestUsers(prisma: PrismaClient) {
    console.log("seedTestUsers is disabled - needs refactor for multi-tenant architecture");
    console.log("Use setupInitialAdmin action instead for creating test users");
    return [];

    /* COMMENTED OUT PENDING REFACTOR
    const users = [];

    for (const [key, userData] of Object.entries(TEST_USERS)) {
        const u = userData as any;
        const hashedPassword = await bcrypt.hash(u.password, 1);

        await prisma.user.deleteMany({ where: { email: u.email } });

        const user = await prisma.user.create({
            data: {
                id: u.id,
                email: u.email,
                name: u.name,
                passwordHash: hashedPassword,
                // TODO: Create TroopMember instead of setting role here
                isActive: u.isActive ?? true,
            },
        });

        users.push(user);

        // Auto-create scout for SCOUT user
        if (userData.role === 'SCOUT') {
            await prisma.scout.upsert({
                where: { userId: user.id },
                update: {},
                create: {
                    name: userData.name,
                    userId: user.id,
                    troopId: 'PLACEHOLDER_TROOP_ID', // TODO: Need actual troop ID
                    status: 'ACTIVE',
                    ibaBalance: 0,
                },
            });
        }
    }

    return users;
    */
}

/**
 * Clean up test users
 */
export async function cleanupTestUsers(prisma: PrismaClient) {
    const emails = Object.values(TEST_USERS).map(u => u.email);
    await prisma.user.deleteMany({
        where: { email: { in: emails } },
    });
}
