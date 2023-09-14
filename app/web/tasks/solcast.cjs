

const { PrismaClient } = require('@prisma/client')
const fetch = require('node-fetch');

const prisma = new PrismaClient()



async function main() {
    let resource_details = await prisma.entity.findFirst({
        where: {
            entity_name: "Solcast"
        },
        include: {
            credentials: true
        }
    });
    let resource_id = '';

    for (const [key, value] of resource_details.credentials) {
        if (key === 'resource_id') {
            resource_id = value
        }
    }

    if (!resource_id) {
        throw 'missing resource id';
    }

    const apiUrl = `https://api.solcast.com.au/rooftop_sites/${resource_id}/forecasts?format=json`;

    // Fetch latest solar forecast data 
    const res = await fetch('https://api.solcast.com.au/forecasts', {
        headers: {
            'Authorization': 'Bearer <your_api_key>'
        }
    });

    const forecasts = await res.json();
    console.log(forecasts);
    // Save each forecast to the database
    // for (const forecast of forecasts) {
    //     await prisma.solarForecast.create({
    //         data: {
    //             period: forecast.period,
    //             energy: forecast.energy,
    //             timezone: forecast.timezone
    //         }
    //     })
    // }

}

main()
    .catch(e => {
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })