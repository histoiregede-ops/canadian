# Fix: Foreign Key Constraint Error for PurchaseOrders.supplierId

## Task
Fix `ER_CANT_CREATE_TABLE` error when creating `PurchaseOrders` table because foreign key constraint is incorrectly formed.

## Steps

- [x] **Step 1**: Add `engine: 'InnoDB'` to `back/models/Supplier.js`
- [x] **Step 2**: Update raw SQL for `Suppliers` table in `back/index.js` to include `ENGINE=InnoDB` and add ALTER TABLE to fix existing MyISAM tables
- [ ] **Step 3**: Restart server to verify the fix
