const express = require("express");

const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
// const { DateTime } = require("luxon");
const date = new Date();

const agentRoutes = require("./agent");
const spendingRoutes = require("./spending");
const tagsRoutes = require("./tags");

router.use("/agent", agentRoutes);
router.use("/spending", spendingRoutes);
router.use("/tags", tagsRoutes);

router.get("/", async (req, res) => {
    const month = req.query.month || res.locals.currentMonth;

    const income = await prisma.$queryRaw`
        SELECT
            strftime('%Y-%m', datetime(round(date / 1000), 'unixepoch')) AS month,
            ROUND(SUM(amount), 2) AS amount
        FROM
            finance_transactions t
        WHERE
            direction = 'IN'  -- or whatever value indicates incoming transactions in your DATABASE
            AND SOURCE != 'INTERNAL_TRANSFER'
            GROUP BY 1 
            ORDER BY 1
    `;

    const outgoings = await prisma.$queryRaw`
        SELECT
            strftime('%Y-%m', datetime(round(t.date / 1000), 'unixepoch')) AS month,
            ROUND(SUM(t.amount), 2) as amount
        FROM
            finance_transactions t
        LEFT JOIN 
            finance_agents a ON t.agent_id = a.id
        LEFT JOIN
            finance_agents ap ON a.parent_id = ap.id
        WHERE
            t.direction = 'OUT'
            -- AND t.SOURCE != 'INTERNAL_TRANSFER'
            AND ((t.status = 'SETTLED') OR (t.status IS NULL))
            AND t.spending_category NOT IN ('SAVING', 'DEBT_REPAYMENT')
            AND a.ignore IS FALSE
            AND a.one_off IS FALSE
            AND t.one_off_cost IS FALSE
            AND t.ignore_cost IS FALSE
        GROUP BY
            1
        ORDER BY
            1
    `;
    res.render("finance/index", {
        title: "Overview",
        outgoings,
        yearmonth: month,
        income,
    });
});

router.get("/income", async (req, res) => {
    const month = req.query.month || res.locals.currentMonth;

    try {
        const transactions = await prisma.$queryRaw`
            SELECT
                strftime('%Y-%m', datetime(round(date / 1000), 'unixepoch')) AS month,
                CASE 
                    WHEN a.parent_id IS NOT NULL THEN ap.name
                    ELSE t.counter_party
                END as counter_party,
                CASE
                    WHEN a.parent_id IS NOT NULL THEN ap.id
                    ELSE t.agent_id
                END AS agent_id,
                reference,
                SUM(amount) as amount
            FROM
                finance_transactions t
            LEFT JOIN 
                finance_agents a ON t.agent_id = a.id
            LEFT JOIN
                finance_agents ap ON a.parent_id = ap.id
            WHERE
                direction = 'IN'  -- or whatever value indicates incoming transactions in your DATABASE
                AND source != 'INTERNAL_TRANSFER'
                AND a.ignore IS FALSE
                AND strftime('%Y-%m', datetime(round(date / 1000), 'unixepoch')) = ${month}
            GROUP BY
                1,2,3,4
            ORDER BY month desc;
        `;
        let income_total = 0;
        for (const t of transactions) {
            income_total += t.amount;
        }
        res.render("finance/income", {
            title: "Income",
            transactions,
            yearmonth: month,
            income_total,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching income");
    }
});

router.get("/transaction/update", async (req, res, next) => {
    const id = Number(req.query.id);
    const { action } = req.query;

    if (action === "one-off") {
        const insert_id = await prisma.transaction.update({
            where: {
                id,
            },
            data: {
                one_off_cost: true,
            },
        });
    } else if (action === "essential") {
        const insert_id = await prisma.transaction.update({
            where: {
                id,
            },
            data: {
                essential_cost: true,
            },
        });
    } else if (action === "regular") {
        const insert_id = await prisma.transaction.update({
            where: {
                id,
            },
            data: {
                regular_cost: true,
            },
        });
    }
    res.redirect("back");
});

router.get("/trends", async (req, res, next) => {
    const grouped_spending = await prisma.$queryRaw`
        SELECT
            strftime('%Y-%m', datetime(round(t.date / 1000), 'unixepoch')) AS month,
            t.spending_category AS category,
            ROUND(SUM(t.amount), 2) as amount
        FROM
            finance_transactions t
        INNER JOIN finance_agents a ON a.id = t.agent_id
        WHERE
            t.direction = 'OUT'
            AND t.SOURCE != 'INTERNAL_TRANSFER'
            AND ((t.status = 'SETTLED') OR (t.status IS NULL))
            AND t.spending_category NOT IN ('SAVING', 'DEBT_REPAYMENT')
            AND t.agent_id NOT IN (457, 119, 549, 25, 141, 19)
            AND a.ignore IS FALSE
            AND strftime('%Y-%m', datetime(round(t.date / 1000), 'unixepoch')) >= '2023-01'
        GROUP BY
            1, 2
        ORDER BY
            month
    `;

    // let categories = transactions.map((transaction) => transaction.spending_category);
    // categories = [...new Set(categories)];

    // console.log(transactions);
    res.render("finance/trends", {
        title: "Finance Trends",
        grouped_spending,
    });
});

module.exports = router;
