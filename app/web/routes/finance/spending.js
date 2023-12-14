const express = require("express");

const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
// const { DateTime } = require("luxon");

router.get("/", async (req, res) => {
    const month = req.query.month || res.locals.currentMonth;

    try {
        const income = await prisma.$queryRaw`
            SELECT
                SUM(amount) as amount
            FROM
                finance_transactions t
            JOIN finance_agents fa on t.agent_id = fa.id
            WHERE
                direction = 'IN'  -- or whatever value indicates incoming transactions in your DATABASE
                AND SOURCE != 'INTERNAL_TRANSFER'
                AND fa.ignore IS FALSE
                AND strftime('%Y-%m', datetime(round(date / 1000), 'unixepoch')) = ${month}
        `;

        const transactions = await prisma.$queryRaw`
            SELECT
                strftime('%Y-%m', datetime(round(t.date / 1000), 'unixepoch')) AS month,
                CASE 
                    WHEN a.parent_id IS NOT NULL THEN ap.name
                    ELSE t.counter_party
                END as counter_party,
                CASE
                    WHEN a.parent_id IS NOT NULL THEN ap.id
                    ELSE t.agent_id
                END AS agent_id,
                -- t.spending_category,
                a.one_off,
                a.essential,
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
                AND strftime('%Y-%m', datetime(round(t.date / 1000), 'unixepoch')) = ${month}
            GROUP BY
                1, 2, 3, 4, 5
            ORDER BY
                1 desc, amount desc
        `;

        const grouped_spending = await prisma.$queryRaw`
            SELECT
                t.spending_category AS category,
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
                and t.ignore_cost is false
                AND strftime('%Y-%m', datetime(round(t.date / 1000), 'unixepoch')) = ${month}
            GROUP BY
                1
        `;

        let spending_total = 0;
        for (const t of transactions) {
            spending_total += t.amount;
        }
        let income_amount = 0;
        if (income[0].amount) {
            income_amount = income[0].amount.toFixed(2);
        }

        // console.log(transactions);
        res.render("finance/spending", {
            title: "Spending",
            transactions,
            grouped_spending,
            spending_total,
            yearmonth: month,
            income: income_amount,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching spending");
    }
});

router.get("/categories", async (req, res) => {
    const { category } = req.query;
    const transactions = await prisma.$queryRaw`
        SELECT
            *
        FROM finance_transactions t
        WHERE
            spending_category = ${category}
        ORDER BY 1
    `;
    res.render("finance/spending/categories", { title: "categories", transactions });
});

module.exports = router;
