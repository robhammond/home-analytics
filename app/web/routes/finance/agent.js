const express = require("express");

const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const { DateTime } = require("luxon");

router.get("/", async (req, res) => {
    const id = Number(req.query.id);

    try {
        const agent = await prisma.agent.findUnique({
            where: {
                id,
            },
        });

        const children = await prisma.agent.findMany({
            where: {
                parent_id: id,
            },
        });

        const transactions = await prisma.$queryRaw`
            SELECT
                strftime('%Y-%m-%d', datetime(round(t.date / 1000), 'unixepoch')) AS date_str,
                t.id,
                CASE 
                    WHEN a.parent_id IS NOT NULL THEN ap.name
                    ELSE t.counter_party
                END AS counter_party,
                t.spending_category,
                t.reference,
                CASE
                    WHEN t.direction = 'OUT' THEN SUM(ROUND(t.amount, 2)) * -1
                    ELSE SUM(ROUND(t.amount, 2))
                END AS amount
            FROM
                finance_transactions t
            LEFT JOIN 
                finance_agents a ON t.agent_id = a.id
            LEFT JOIN
                finance_agents ap ON a.parent_id = ap.id
            WHERE
                (a.id = ${id} OR ap.id = ${id})
                AND ((t.status = 'SETTLED') OR (t.status IS NULL))
            GROUP BY
                1, 2, 3, 4, 5
            ORDER BY
                1 desc, amount desc
        `;
        let avg_monthly_amount;
        try {
            avg_monthly_amount = await prisma.$queryRaw`
                SELECT
                    (CASE
                    WHEN t.direction = 'OUT' THEN SUM(ROUND(t.amount, 2)) * -1
                    ELSE SUM(ROUND(t.amount, 2))
                END / COUNT(DISTINCT strftime('%Y-%m', datetime(round(t.date / 1000), 'unixepoch')))) AS avg_monthly_amount
                FROM
                    finance_transactions t
                LEFT JOIN 
                    finance_agents a ON t.agent_id = a.id
                LEFT JOIN
                    finance_agents ap ON a.parent_id = ap.id
                WHERE
                    (a.id = ${id} OR ap.id = ${id})
                    AND ((t.status = 'SETTLED') OR (t.status IS NULL))
                    -- AND t.direction = 'OUT'
            `;
            avg_monthly_amount = avg_monthly_amount[0].avg_monthly_amount;
        } catch (e) {
            avg_monthly_amount = 0;
        }

        // for the chart
        const aggSql = await prisma.$queryRaw`
            SELECT
                t.date,
                CASE 
                    WHEN a.parent_id IS NOT NULL THEN ap.name
                    ELSE t.counter_party
                END AS counter_party,
                CASE
                    WHEN t.direction = 'OUT' THEN SUM(ROUND(t.amount, 2))
                    ELSE SUM(ROUND(t.amount, 2)) * -1
                END AS amount
            FROM
                finance_transactions t
            LEFT JOIN 
                finance_agents a ON t.agent_id = a.id
            LEFT JOIN
                finance_agents ap ON a.parent_id = ap.id
            WHERE
                (a.id = ${id} OR ap.id = ${id})
                AND ((t.status = 'SETTLED') OR (t.status IS NULL))
            GROUP BY
                1, 2
            ORDER BY
                1 ASC, amount DESC
        `;

        const aggregatedResults = {};
        aggSql.forEach((row) => {
            const bstDateStr = req.app.locals.convertToBST(row.date).toFormat("yyyy-MM");
            if (!aggregatedResults[bstDateStr]) {
                aggregatedResults[bstDateStr] = {};
            }
            if (!aggregatedResults[bstDateStr][row.counter_party]) {
                aggregatedResults[bstDateStr][row.counter_party] = 0;
            }
            aggregatedResults[bstDateStr][row.counter_party] += row.amount;
        });

        const aggResultsArray = [];
        for (const [date_str, counterParties] of Object.entries(aggregatedResults)) {
            for (const [counter_party, amount] of Object.entries(counterParties)) {
                aggResultsArray.push({ date_str, counter_party, amount });
            }
        }

        const tags = await prisma.financeTag.findMany({
            orderBy: {
                name: "asc",
            },
        });

        res.render("finance/agent", {
            title: "Agent",
            agent,
            children,
            transactions,
            transaction_aggs: aggResultsArray,
            avg_monthly_amount,
            tags,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
});

router.post("/update", async (req, res, next) => {
    const {
        id, ignore, one_off, essential, flex_rating,
    } = req.body;

    try {
        const agent = await prisma.agent.update({
            where: {
                id: Number(id),
            },
            data: {
                ignore: !!ignore,
                one_off: !!one_off,
                essential: !!essential,
                flex_rating: Number(flex_rating),
            },
        });
    } catch (e) {
        console.log(`Error executing: ${e}`);
    }
    res.redirect("back");
});

router.get("/:id/aliases", async (req, res) => {
    const { id } = req.params;
    const parentAgent = await prisma.agent.findUnique({ where: { id: Number(id) } });
    const allAgents = await prisma.agent.findMany();
    res.render("finance/agent/aliases", { title: "Set Aliases", parentAgent, allAgents });
});

router.post("/:id/aliases", async (req, res) => {
    const { id } = req.params;
    let { aliases } = req.body;
    if (!Array.isArray(aliases)) {
        aliases = [aliases];
    }
    const updatedAgents = await prisma.agent.updateMany({
        where: { id: { in: aliases.map(Number) } },
        data: { parent_id: Number(id) },
    });
    res.redirect(`/finance/agent?id=${id}`);
});

module.exports = router;
