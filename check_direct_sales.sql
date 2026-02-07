-- Check direct sales inventory and groups
SELECT 
    dsi.id as inventory_id,
    cp.name as product_name,
    cp."ibaAmount" as iba_amount_per_unit,
    dsi.quantity as total_inventory,
    dsg.id as group_id,
    dsg.name as group_name,
    dsg."soldCount" as units_sold
FROM "DirectSalesInventory" dsi
JOIN "CampaignProduct" cp ON dsi."productId" = cp.id
LEFT JOIN "DirectSalesGroup" dsg ON dsg."inventoryId" = dsi.id
ORDER BY dsi.id, dsg.id;

-- Check volunteers in each group
SELECT 
    dsg.name as group_name,
    dsg."soldCount",
    s.name as scout_name,
    u.name as adult_name
FROM "DirectSalesGroup" dsg
LEFT JOIN "DirectSalesVolunteer" dsv ON dsv."groupId" = dsg.id
LEFT JOIN "Scout" s ON dsv."scoutId" = s.id
LEFT JOIN "User" u ON dsv."userId" = u.id
ORDER BY dsg.name, s.name, u.name;
