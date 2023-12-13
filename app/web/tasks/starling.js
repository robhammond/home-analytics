const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function getAuth() {
    try {
        const res = await prisma.apiCredentials.findFirst({
            where: {
                api: {
                    name: "Starling Bank",
                },
            },
            select: {
                key: true,
                value: true,
            },
        });
        return res.value;
    } catch (error) {
        throw new Error(`Authorization token not found in DB: ${error}`);
    }
}

class Transaction {
    constructor(
        uid,
        date,
        counterParty,
        counterPartySubEntityName,
        source,
        sourceSubType,
        reference,
        amount,
        balance,
        direction,
        status,
        spendingCategory,
        notes,
        dataSource,
        agentId,
    ) {
        this.uid = uid;
        this.date = date;
        this.counter_party = counterParty;
        this.counter_party_sub_entity = counterPartySubEntityName;
        this.source = source;
        this.source_sub_type = sourceSubType;
        this.reference = reference;
        this.amount = amount;
        this.balance = balance;
        this.direction = direction;
        this.status = status;
        this.spending_category = spendingCategory;
        this.notes = notes;
        this.data_source = dataSource;
        this.agent_id = agentId;
    }
}

async function performRequest(path, accessToken) {
    const url = `https://api.starlingbank.com/api/v2/${path}`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const response = await axios.get(url, { headers });
    return response.data;
}

async function getTransactions(accessToken, accountId, categoryId) {
    const yesterday = new Date(Date.now() - 86400 * 1000).toISOString();
    const oneYearAgo = new Date(Date.now() - 86400 * 1000 * 365).toISOString();

    const data = await performRequest(`feed/account/${accountId}/category/${categoryId}?changesSince=${oneYearAgo}`, accessToken);
    const transactions = data.feedItems;

    const transactionsList = [];
    for (const transaction of transactions) {
        const agent = await getOrCreateAgent(
            transaction.counterPartyName,
            transaction.counterPartyType,
        );

        // console.log(transaction);
        transactionsList.push(new Transaction(
            transaction.feedItemUid,
            transaction.transactionTime,
            transaction.counterPartyName,
            transaction.counterPartySubEntityName,
            transaction.source,
            transaction.sourceSubType,
            transaction.reference || "",
            transaction.amount.minorUnits / 100.0,
            (transaction.balance && transaction.balance.minorUnits || 0) / 100.0,
            transaction.direction,
            transaction.status,
            transaction.spendingCategory,
            transaction.notes,
            "starling",
            agent.id,
        ));
    }

    return transactionsList;
}

async function getOrCreateAgent(counterParty, type) {
    let agent = await prisma.agent.findFirst({
        where: {
            name: counterParty,
        },
    });
    if (!agent) {
        agent = await prisma.agent.create({
            data: {
                name: counterParty,
                type: type || "",
            },
        });
    }
    return agent;
}

async function saveToLocalDB(transactions) {
    for (const transaction of transactions) {
        try {
            const transactionFields = {
                date: new Date(transaction.date),
                counter_party: transaction.counter_party,
                counter_party_sub_entity: transaction.counter_party_sub_entity,
                source: transaction.source,
                source_sub_type: transaction.source_sub_type,
                reference: transaction.reference,
                amount: transaction.amount,
                balance: transaction.balance,
                direction: transaction.direction,
                status: transaction.status,
                spending_category: transaction.spending_category,
                notes: transaction.notes,
                data_source: transaction.data_source,
                agent_id: transaction.agent_id,
            };
            await prisma.transaction.upsert({
                where: {
                    uid: transaction.uid,
                },
                update: transactionFields,
                create: {
                    uid: transaction.uid,
                    ...transactionFields,
                },
            });
        } catch (error) {
            console.log(error);
        }
    }
}

(async () => {
    const accessToken = await getAuth();
    if (!accessToken) {
        console.error("Please set the Starling Access Token");
        process.exit(1);
    }

    const accounts = await performRequest("accounts", accessToken);
    const account = accounts.accounts[0];
    const transactions = await getTransactions(accessToken, account.accountUid, account.defaultCategory);

    await saveToLocalDB(transactions);

    console.log("Transactions and agents saved to local database");
})();
