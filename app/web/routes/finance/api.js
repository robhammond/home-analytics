const express = require("express");

const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const date = new Date();

// Create a new transaction
router.post("/transactions", async (req, res) => {
    const newTransaction = req.body;
    const result = await prisma.transaction.create({
        data: newTransaction,
    });
    res.json(result);
});

// Get all transactions
router.get("/transactions", async (req, res) => {
    const yearmonth = req.query.yearmonth || res.locals.currentMonth;
    const yearmonth_end = req.query.yearmonth_end || res.locals.currentMonth;

    const transactions = await prisma.$queryRaw`
        SELECT
            strftime('%Y-%m-%d', datetime(round(t.date / 1000), 'unixepoch')) AS date,
            CASE 
                WHEN a.parent_id IS NOT NULL THEN ap.name
                ELSE t.counter_party
            END as counter_party,
            -- CASE
            --     WHEN a.parent_id IS NOT NULL THEN ap.id
            --     ELSE t.agent_id
            -- END AS agent_id,
            -- t.spending_category,
            a.one_off,
            a.essential,
            ROUND(SUM(t.amount), 2) as amount
        FROM
            transactions t
        LEFT JOIN 
            agents a ON t.agent_id = a.id
        LEFT JOIN
            agents ap ON a.parent_id = ap.id
        WHERE
            t.direction = 'OUT'
            -- AND t.SOURCE != 'INTERNAL_TRANSFER'
            AND ((t.status = 'SETTLED') OR (t.status IS NULL))
            AND t.spending_category NOT IN ('SAVING', 'DEBT_REPAYMENT')
            AND a.ignore IS FALSE
            AND a.one_off IS FALSE
            AND t.one_off_cost IS FALSE
            AND t.ignore_cost IS FALSE
            AND strftime('%Y-%m', datetime(round(t.date / 1000), 'unixepoch')) BETWEEN ${yearmonth} AND ${yearmonth_end}
        GROUP BY
            1, 2, 3, 4
        ORDER BY
            1 desc, amount desc
    `;
    res.json(transactions);
});

// Get a single transaction by ID
router.get("/transactions/:id", async (req, res) => {
    const { id } = req.params;
    const transaction = await prisma.transaction.findUnique({
        where: { id: Number(id) },
    });
    res.json(transaction);
});

// Update a transaction by ID
router.put("/transactions/:id", async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const updatedTransaction = await prisma.transaction.update({
        where: { id: Number(id) },
        data: updateData,
    });
    res.json(updatedTransaction);
});

// Delete a transaction by ID
router.delete("/transactions/:id", async (req, res) => {
    const { id } = req.params;
    const deletedTransaction = await prisma.transaction.delete({
        where: { id: Number(id) },
    });
    res.json(deletedTransaction);
});

// Similar endpoints can be created for agents
router.post("/agents", async (req, res) => { /* ... */ });
router.get("/agents", async (req, res) => { /* ... */ });
router.get("/agents/:id", async (req, res) => { /* ... */ });
router.put("/agents/:id", async (req, res) => { /* ... */ });
router.delete("/agents/:id", async (req, res) => { /* ... */ });

// Similar endpoints can be created for tags
router.post("/tags", async (req, res) => { /* ... */ });
router.get("/tags", async (req, res) => { /* ... */ });
router.get("/tags/:id", async (req, res) => { /* ... */ });
router.put("/tags/:id", async (req, res) => { /* ... */ });
router.delete("/tags/:id", async (req, res) => { /* ... */ });

module.exports = router;
