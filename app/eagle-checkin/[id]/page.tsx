import { verifyCheckInToken } from "@/lib/actions/eagle-project"
import { CheckInForm } from "@/components/eagle/check-in-form"
import { notFound } from "next/navigation"

export default async function CheckInPage({ params, searchParams }: {
    params: Promise<any>,
    searchParams: Promise<{ token?: string }>
}) {
    const { id } = await params
    const { token } = await searchParams

    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <h1 className="text-2xl font-bold text-destructive mb-2">Invalid Link</h1>
                <p>Missing check-in token. Please scan the QR code again.</p>
            </div>
        )
    }

    const verification = await verifyCheckInToken(id, token)

    if (verification.error || !verification.workDay) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <h1 className="text-2xl font-bold text-destructive mb-2">Check-in Failed</h1>
                <p>{verification.error || "Invalid check-in link or expired."}</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <CheckInForm workDay={verification.workDay} token={token} />
        </div>
    )
}
