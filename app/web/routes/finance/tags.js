const express = require("express");

const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const date = new Date();

async function applyRulesToMatchingTransactions(rule) {
    let transactions = await prisma.transaction.findMany();
    if (rule.transaction_id) {
        transactions = transactions.filter((transaction) => transaction.id === rule.transaction_id);
    }
    if (rule.agent_id) {
        transactions = transactions.filter((transaction) => transaction.agent_id === rule.agent_id);
    }
    if (rule.reference) {
        transactions = transactions.filter((transaction) => transaction.reference && transaction.reference.toLowerCase() === rule.reference.toLowerCase());
    }
    for (const transaction of transactions) {
        const existingTag = await prisma.transactionTags.findUnique({
            where: {
                tag_id_transaction_id: {
                    tag_id: rule.tag_id,
                    transaction_id: transaction.id,
                },
            },
        });

        if (!existingTag) {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { TransactionTags: { create: { tag_id: rule.tag_id } } },
            });
        }
    }
}

// Apply all rules to the matching transactions
async function applyAllRules() {
    // Fetch all rules from the database
    const rules = await prisma.rule.findMany();

    // Apply each rule to the matching transactions
    for (const rule of rules) {
        await applyRulesToMatchingTransactions(rule);
    }
}

router.get("/", async (req, res) => {
    const spending_categories = await prisma.$queryRaw`
        SELECT
            spending_category,
            tz.name AS tag_name
        FROM finance_transactions t
        LEFT JOIN finance_tag_map tm
            ON tm.alternative_name = spending_category
        LEFT JOIN finance_tags tz
            ON tz.id = tm.tag_id
        GROUP BY 1,2
        ORDER BY 1
    `;

    const tags = await prisma.financeTag.findMany({
        orderBy: {
            name: "asc",
        },
    });
    res.render("finance/tags", { title: "Tags", spending_categories, tags });
});

router.get("/chart", async (req, res) => {
    const month = req.query.month || res.locals.currentMonth;
    const tag_names = await prisma.financeTag.findMany({});

    const tag_agg = await prisma.$queryRaw`
        SELECT
            tz.id AS tag_id,
            tz.name AS tag_name,
            ROUND(SUM(amount), 2) AS amount
        FROM finance_transactions t
        LEFT JOIN finance_tag_map tm
            ON tm.alternative_name = spending_category
        LEFT JOIN finance_tags tz
            ON tz.id = tm.tag_id
        LEFT JOIN finance_agents a ON t.agent_id = a.id AND a.ignore IS FALSE
        LEFT JOIN finance_agents ap ON a.parent_id = ap.id AND ap.ignore IS FALSE
        WHERE
            strftime('%Y-%m', datetime(round(date / 1000), 'unixepoch')) = ${month}
            AND tz.name IS NOT NULL
            AND tz.name != 'Savings'
            AND tz.name != 'Debt Repayment'
            AND t.ignore_cost IS FALSE
            AND a.ignore IS FALSE
            AND (ap.ignore IS FALSE OR ap.ignore IS NULL)
        GROUP BY 1,2
        ORDER BY 3 DESC
    `;

    const tag_trends = await prisma.$queryRaw`
        SELECT
            strftime('%Y-%m', datetime(round(date / 1000), 'unixepoch')) AS month,
            tz.name AS category,
            ROUND(SUM(amount), 2) AS amount
        FROM finance_transactions t
        LEFT JOIN finance_tag_map tm
            ON tm.alternative_name = spending_category
        LEFT JOIN finance_tags tz
            ON tz.id = tm.tag_id
        LEFT JOIN finance_agents a ON t.agent_id = a.id AND a.ignore IS FALSE
        LEFT JOIN finance_agents ap ON a.parent_id = ap.id AND ap.ignore IS FALSE
        WHERE
            tz.name IS NOT NULL
            AND tz.name != 'Savings'
            AND tz.name != 'Debt Repayment'
            AND t.ignore_cost IS FALSE
            AND a.ignore IS FALSE
            AND (ap.ignore IS FALSE OR ap.ignore IS NULL)
        GROUP BY 1,2
        ORDER BY 1
    `;
    res.render("finance/tags/chart", {
        title: "Tag agg",
        tag_agg,
        yearmonth: month,
        tag_names,
        tag_trends,
    });
});

router.get("/report", async (req, res) => {
    const tag_id = Number(req.query.id);
    const yearmonth = req.query.month || res.locals.currentMonth;

    const tag = await prisma.financeTag.findFirst({
        where: {
            id: tag_id,
        },
    });

    // TODO: the ignore flag isn't working on the agents
    const tag_agg = await prisma.$queryRaw`
        SELECT
            CASE 
                WHEN a.parent_id IS NOT NULL THEN ap.name
                ELSE t.counter_party
            END as counter_party,
            CASE 
                WHEN a.parent_id IS NOT NULL THEN ap.id
                ELSE a.id
            END AS counter_party_id,
            ROUND(SUM(t.amount), 2) AS amount
        FROM finance_transactions t
        LEFT JOIN finance_tag_map tm ON tm.alternative_name = t.spending_category
        LEFT JOIN finance_tags tz ON tz.id = tm.tag_id
        LEFT JOIN finance_transaction_tags tt ON t.id = tt.transaction_id
        LEFT JOIN finance_agents a ON t.agent_id = a.id AND a.ignore IS FALSE
        LEFT JOIN finance_agents ap ON a.parent_id = ap.id AND ap.ignore IS FALSE
        WHERE
            strftime('%Y-%m', datetime(round(t.date / 1000), 'unixepoch')) = ${yearmonth}
            AND 
            (
                (tt.tag_id IS NOT NULL AND tt.tag_id = ${tag_id}) 
                OR 
                (tt.tag_id IS NULL AND tz.id = ${tag_id})
            )
            AND t.ignore_cost IS FALSE
            AND a.ignore IS FALSE
            AND (ap.ignore IS FALSE OR ap.ignore IS NULL)
            AND ((t.status = 'SETTLED') OR (t.status IS NULL))
        GROUP BY 1,2
        ORDER BY 3 DESC
    `;

    let total_spend = 0;
    for (const t of tag_agg) {
        total_spend += t.amount;
    }

    const tag_trends = await prisma.$queryRaw`
        SELECT
            -- strftime('%Y-%m', datetime(round(t.date / 1000), 'unixepoch')) AS month,
            t.date,
            CASE 
                WHEN a.parent_id IS NOT NULL THEN ap.name
                ELSE t.counter_party
            END as counter_party,
            ROUND(SUM(t.amount), 2) AS amount
        FROM finance_transactions t
        LEFT JOIN finance_tag_map tm ON tm.alternative_name = t.spending_category
        LEFT JOIN finance_tags tz ON tz.id = tm.tag_id
        LEFT JOIN finance_transaction_tags tt ON t.id = tt.transaction_id
        LEFT JOIN finance_agents a ON t.agent_id = a.id AND a.ignore IS FALSE
        LEFT JOIN finance_agents ap ON a.parent_id = ap.id AND ap.ignore IS FALSE
        WHERE
            strftime('%Y-%m', datetime(round(t.date / 1000), 'unixepoch')) >= strftime('%Y-%m', datetime('now', '-13 month'))
            AND 
            (
                (tt.tag_id IS NOT NULL AND tt.tag_id = ${tag_id}) 
                OR 
                (tt.tag_id IS NULL AND tz.id = ${tag_id})
            )
            AND t.ignore_cost IS FALSE
            AND a.ignore IS FALSE
            AND (ap.ignore IS FALSE OR ap.ignore IS NULL)
            AND t.direction = 'OUT'
            AND ((t.status = 'SETTLED') OR (t.status IS NULL))
        GROUP BY 1,2
        ORDER BY 1
    `;

    const trendResults = {};
    tag_trends.forEach((row) => {
        const bstDateStr = req.app.locals.convertToBST(row.date).toFormat("yyyy-MM");
        if (!trendResults[bstDateStr]) {
            trendResults[bstDateStr] = {};
        }
        if (!trendResults[bstDateStr][row.counter_party]) {
            trendResults[bstDateStr][row.counter_party] = 0;
        }
        trendResults[bstDateStr][row.counter_party] += row.amount;
    });

    const trendResultsArray = [];
    for (const [month, counterParties] of Object.entries(trendResults)) {
        for (const [counter_party, amount] of Object.entries(counterParties)) {
            trendResultsArray.push({ month, counter_party, amount });
        }
    }
    let avg_spend = 0;
    for (const t of trendResultsArray) {
        avg_spend += t.amount;
    }
    avg_spend = (avg_spend / 13).toFixed(2);

    res.render("finance/tags/report", {
        title: `Tag report - ${tag.name}`,
        tag_agg,
        tag_trends: trendResultsArray,
        yearmonth,
        tag_id,
        total_spend,
        avg_spend,
    });
});

router.get("/map-tag", async (req, res) => {
    const { spending_category } = req.query;
    res.render("finance/tags/map-tag", { title: "Map Tags", spending_category });
});

router.post("/map-tag", async (req, res) => {
    const { spending_category, tag } = req.body;

    let tagId;
    try {
        tagId = await prisma.financeTag.create({
            data: {
                name: tag,
            },
        });
    } catch (e) {
        tagId = await prisma.financeTag.findFirst({
            where: {
                name: tag,
            },
        });
    }

    try {
        const tagMap = await prisma.financeTagMap.create({
            data: {
                tag_id: tagId.id,
                alternative_name: spending_category,
            },
        });
    } catch (e) {
        console.log(`Error inserting record: ${e}`);
    }

    res.redirect("/finance/tags");
});

router.get("/rules/home", async (req, res, next) => {
    const rules = await prisma.financeRule.findMany();

    const tags = await prisma.financeTag.findMany({
        orderBy: {
            name: "asc",
        },
    });
    res.render("finance/tags/rules", {
        title: "Tag Rules",
        tags,
        rules,
    });
});

// Route to render the new rule form
router.get("/rules/new", async (req, res) => {
    const tags = await prisma.financeTag.findMany({ orderBy: { name: "asc" } });
    const agents = await prisma.agent.findMany({ orderBy: { name: "asc" } });
    res.render("finance/tags/new-rule", { tags, agents });
});

// Route to render the edit rule form
router.get("/rules/edit/:id", async (req, res) => {
    const rule = await prisma.financeRule.findUnique({ where: { id: Number(req.params.id) } });
    const tags = await prisma.financeTag.findMany({ orderBy: { name: "asc" } });
    const agents = await prisma.agent.findMany({ orderBy: { name: "asc" } });
    res.render("finance/tags/edit-rule", { rule, tags, agents });
});

// Create a new rule
// Create a new rule
router.post("/rules", async (req, res) => {
    const tag_id = Number(req.body.tag_id);
    const agent_id = Number(req.body.agent_id);
    const transaction_id = req.body.transaction_id ? Number(req.body.transaction_id) : null;
    const newRule = await prisma.financeRule.create({
        data: {
            agent_id,
            reference: req.body.reference,
            tag_id,
            transaction_id,
        },
    });
    res.json(newRule);
});

// Get all rules
router.get("/rules", async (req, res) => {
    const rules = await prisma.financeRule.findMany();
    res.json(rules);
});

// Get a specific rule
router.get("/rules/:id", async (req, res) => {
    const rule = await prisma.financeRule.findUnique({
        where: { id: Number(req.params.id) },
    });
    res.json(rule);
});

// Update a rule
// Update a rule
router.put("/rules/:id", async (req, res) => {
    const tag_id = Number(req.body.tag_id);
    const agent_id = Number(req.body.agent_id);
    const transaction_id = req.body.transaction_id ? Number(req.body.transaction_id) : null;
    const updatedRule = await prisma.financeRule.update({
        where: { id: Number(req.params.id) },
        data: {
            agent_id,
            reference: req.body.reference,
            tag_id,
            transaction_id,
        },
    });
    res.json(updatedRule);
});

// Delete a rule
router.delete("/rules/:id", async (req, res) => {
    const deletedRule = await prisma.financeRule.delete({
        where: { id: Number(req.params.id) },
    });
    res.json(deletedRule);
});

router.post("/rules/apply", async (req, res) => {
    try {
        // Apply all rules to the matching transactions
        await applyAllRules();

        res.json({ message: "Rules applied successfully." });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "An error occurred while applying the rules.", error });
    }
});

module.exports = router;
