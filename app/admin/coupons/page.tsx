import { getCoupons, getPromotionCodes } from "@/app/actions/admin"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CouponList } from "./_components/coupon-list"
import { PromoCodeList } from "./_components/promo-code-list"
import { CreateCouponDialog } from "./_components/create-coupon-dialog"
import { CreatePromoCodeDialog } from "./_components/create-promo-code-dialog"

export default async function CouponsPage() {
    const [coupons, promoCodes] = await Promise.all([
        getCoupons(),
        getPromotionCodes()
    ])

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Discounts & Promotions</h1>
                    <p className="text-muted-foreground">Manage Stripe coupons and customer promotion codes.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <CreateCouponDialog />
                    <CreatePromoCodeDialog coupons={coupons} />
                </div>
            </div>

            <Tabs defaultValue="coupons" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="coupons">Coupons</TabsTrigger>
                    <TabsTrigger value="promos">Promotion Codes</TabsTrigger>
                </TabsList>

                <TabsContent value="coupons" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Coupons</CardTitle>
                            <CardDescription>Coupons define the discount amount and duration.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CouponList coupons={coupons} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="promos" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Promotion Codes</CardTitle>
                            <CardDescription>Codes that customers enter at checkout, linked to a coupon.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PromoCodeList promoCodes={promoCodes} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
