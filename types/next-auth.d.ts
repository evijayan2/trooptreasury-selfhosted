import { DefaultSession } from "next-auth"
import { Role } from "@prisma/client"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role?: Role // Optional for now, prefer using TroopMember.role
        } & DefaultSession["user"]
    }

    interface User {
        role?: Role // Optional for backwards compatibility
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role?: Role // Optional for backwards compatibility
    }
}
