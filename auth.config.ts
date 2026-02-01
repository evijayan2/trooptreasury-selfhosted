import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 15 * 60, // 15 minutes
    },
    callbacks: {
        authorized({ auth, request }) {
            const { nextUrl } = request
            const isLoggedIn = !!auth?.user

            if (nextUrl.pathname.includes('.') && !nextUrl.pathname.endsWith('.html')) {
                return true
            }

            console.log(`[AUTH-TRACE] path=${nextUrl.pathname} loggedIn=${isLoggedIn} user=${auth?.user?.name || 'none'}`);

            if (request.method === "OPTIONS") return true

            const isProtected = nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname.startsWith("/dashboard")

            if (isProtected) {
                if (isLoggedIn) return true
                return false // Redirect unauthenticated users to login
            } else if (isLoggedIn) {
                // If logged in and on login/home, redirect to dashboard (or default troop later)
                if (nextUrl.pathname === "/login" || nextUrl.pathname === "/") {
                    // Temporary: redirect to a generic dashboard or let them stay? 
                    // For now, let's keep the dashboard redirect.
                    return Response.redirect(new URL('/dashboard', nextUrl))
                }
            }
            return true
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                // Adding global role to token for Platform Admin checks
                token.role = (user as any).role
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string
                // Pass global role to session front-end
                /* @ts-ignore */
                session.user.role = token.role
            }
            return session
        },
    },
    providers: [], // Configured in auth.ts
} satisfies NextAuthConfig
