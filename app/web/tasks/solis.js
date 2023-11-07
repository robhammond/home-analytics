const axios = require("axios");
const sqlite = require("sqlite");
const crypto = require("crypto");
const program = require("commander");

const API_BASE = "https://www.soliscloud.com:13333";
const VERB = "POST";

async function getCreds() {
    const db = await sqlite.open(HA_DB_URL);
    const sql = `
    SELECT key, value
    FROM Credentials c
    JOIN entities e ON e.id = c.entityId
    WHERE LOWER(e.entity_name) LIKE 'solis%'
  `;
    const creds = {};
    try {
        const res = await db.all(sql);
        for (const row of res) {
            creds[row.key] = row.value;
        }
    } catch (err) {
        throw new Error("Authorization details not found in DB");
    }
    await db.close();
    return creds;
}

function prepareHeader(creds, body, canonicalizedResource) {
    const contentMD5 = crypto.createHash("md5").update(JSON.stringify(body)).digest("base64");
    const contentType = "application/json";
    const date = new Date().toUTCString();
    const encryptStr = `${VERB}\n${contentMD5}\n${contentType}\n${date}\n${canonicalizedResource}`;
    const hmac = crypto.createHmac("sha1", creds.key_secret).update(encryptStr).digest("base64");
    const authorization = `API ${creds.key_id}:${hmac}`;
    return {
        "Content-MD5": contentMD5,
        "Content-Type": contentType,
        Date: date,
        Authorization: authorization,
    };
}

async function getInverterDay(requestDate) {
    // Implementation omitted for brevity. Use axios for HTTP requests.
}

async function getStationDay(requestDate) {
    // Implementation omitted for brevity. Use axios for HTTP requests.
}

async function getStationDayEnergyList(requestDate) {
    // Implementation omitted for brevity. Use axios for HTTP requests.
}

async function getStationList() {
    // Implementation omitted for brevity. Use axios for HTTP requests.
}

program
    .option("--date <date>", "Single date in the format YYYY-MM-DD")
    .option("--start_date <start_date>", "Start date in the format YYYY-MM-DD")
    .option("--end_date <end_date>", "End date in the format YYYY-MM-DD")
    .option("--unit <unit>", "Time unit - either mins or days")
    .action(async (options) => {
        if (options.date) {
            if (options.unit === "mins") {
                await getStationDay(options.date);
            } else {
                await getStationDayEnergyList(options.date);
            }
        } else if (options.start_date && options.end_date) {
            // Loop through dates and call functions.
            // Sleep between calls as needed.
        } else {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
            if (options.unit === "mins") {
                await getStationDay(yesterday);
            } else {
                await getStationDayEnergyList(yesterday);
            }
        }
    });

program.parse(process.argv);
