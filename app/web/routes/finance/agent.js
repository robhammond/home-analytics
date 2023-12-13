const express = require("express");

const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const { DateTime } = require("luxon");

router.get("/", async (req, res, next) => {
    const id = Number(req.query.id);

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
            END as counter_party,
            t.spending_category,
            t.reference,
            SUM(ROUND(t.amount, 2)) as amount
        FROM
            finance_transactions t
        LEFT JOIN 
            finance_agents a ON t.agent_id = a.id
        LEFT JOIN
            finance_agents ap ON a.parent_id = ap.id
        WHERE
            (a.id = ${id} OR ap.id = ${id})
            AND t.direction = 'OUT'
            AND ((t.status = 'SETTLED') OR (t.status IS NULL))
        GROUP BY
            1, 2, 3, 4, 5
        ORDER BY
            1 desc, amount desc
    `;
    let avg_monthly_spend;
    try {
        avg_monthly_spend = await prisma.$queryRaw`
            SELECT
                (SUM(ROUND(t.amount, 2)) / COUNT(DISTINCT strftime('%Y-%m', datetime(round(t.date / 1000), 'unixepoch')))) as avg_monthly_spend
            FROM
                finance_transactions t
            LEFT JOIN 
                finance_agents a ON t.agent_id = a.id
            LEFT JOIN
                finance_agents ap ON a.parent_id = ap.id
            WHERE
                (a.id = ${id} OR ap.id = ${id})
                AND ((t.status = 'SETTLED') OR (t.status IS NULL))
                AND t.direction = 'OUT'
        `;
        avg_monthly_spend = avg_monthly_spend[0].avg_monthly_spend;
    } catch (e) {
        avg_monthly_spend = 0;
    }

    const aggSql = await prisma.$queryRaw`
        SELECT
            t.date,
            CASE 
                WHEN a.parent_id IS NOT NULL THEN ap.name
                ELSE t.counter_party
            END as counter_party,
            ROUND(sum(t.amount), 2) as amount
        FROM
            finance_transactions t
        LEFT JOIN 
            finance_agents a ON t.agent_id = a.id
        LEFT JOIN
            finance_agents ap ON a.parent_id = ap.id
        WHERE
            (a.id = ${id} OR ap.id = ${id})
            AND t.direction = 'OUT'
            AND ((t.status = 'SETTLED') OR (t.status IS NULL))
        GROUP BY
            1, 2
        ORDER BY
            1 asc, amount desc
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

    const tags = await prisma.tag.findMany({
        orderBy: {
            name: "asc",
        },
    });

    res.render("agent", {
        title: "Agent",
        agent,
        children,
        transactions,
        transaction_aggs: aggResultsArray,
        avg_monthly_spend,
        tags,
    });
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
    res.render("agent/aliases", { title: "Set Aliases", parentAgent, allAgents });
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
    res.redirect(`/agent?id=${id}`);
});

module.exports = router;
