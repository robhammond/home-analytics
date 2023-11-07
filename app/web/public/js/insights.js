function loadUsagePie(startDate, endDate) {
    $.ajax({
        url: "/api/usage/breakdown",
        type: "GET",
        data: {
            start: startDate,
            end: endDate,
        },
        dataType: "json",
        success(res) {
            const row_data = [];
            for (const row of res.data) {
                row_data.push({ name: row.name, y: row.kwh });
            }
            usagePie.addSeries({ name: "Usage Type", data: row_data, innerSize: "50%" });
        },
        error(xhr) {
            console.log(xhr);
        },
        cache: false,
    });
}

function loadUsageMain(unit, startDate, endDate, filter) {
    const dataSeries = [];
    const xAxisCats = [];
    $.ajax({
        url: "/api/usage/main",
        type: "GET",
        data: {
            start: startDate,
            end: endDate,
            unit,
            filter,
        },
        dataType: "json",
        success(res) {
            const kwh = [];
            const cost = [];
            for (const row of res.data) {
                kwh.push(row.kwh);
                cost.push(row.cost);
                xAxisCats.push(row.dt);
            }
            dataSeries.push({
                name: "kWh", data: kwh, type: "column", yAxis: 0,
            });
            dataSeries.push({
                name: "Cost", data: cost, type: "line", yAxis: 1,
            });
        },
        error(xhr) {
            console.log(xhr);
        },
        cache: false,
    });
}

function loadTodayUsage(date1, date2) {
    const dataSeries = [];
    const xAxisCats = [];
    $.ajax({
        url: "/api/usage/hourly/compare",
        type: "GET",
        data: {
            date1,
            date2,
            unit: "halfhour",
        },
        dataType: "json",
        success(res) {
            const d1 = [];
            const d2 = [];
            for (const row of res.data) {
                d1.push(row.kwh_yd);
                d2.push(row.kwh_td);
                xAxisCats.push(row.hour);
            }
            dataSeries.push({ name: "Yesterday", data: d1 });
            dataSeries.push({ name: "Today", data: d2 });
        },
        error(xhr) {
            console.log(xhr);
        },
        cache: false,
    });
}

function loadCarCharging(unit, start, end) {
    const dataSeries = [];
    const xAxisCats = [];
    $.ajax({
        url: "/api/usage/vehicles",
        type: "GET",
        data: {
            start,
            end,
            unit,
        },
        dataType: "json",
        success(res) {
            const kwh = [];
            const cost = [];
            for (const row of res.data) {
                kwh.push(row.kwh);
                cost.push(row.cost);
                xAxisCats.push(row.dt);
            }
            dataSeries.push({
                name: "kWh", data: kwh, type: "column", yAxis: 0,
            });
            dataSeries.push({
                name: "Cost", data: cost, type: "column", yAxis: 1,
            });
        },
        error(xhr) {
            console.log(xhr);
        },
        cache: false,
    });
}

function loadHeatingChart(unit, startDate, endDate) {
    const dataSeries = [];
    const xAxisCats = [];
    $.ajax({
        url: "/api/usage/heating",
        type: "GET",
        data: {
            start: startDate,
            end: endDate,
            unit,
        },
        dataType: "json",
        success(res) {
            const heating = [];
            const hotWater = [];
            for (const row of res.data) {
                heating.push(row.heating_kwh);
                hotWater.push(row.hot_water_kwh);
                xAxisCats.push(row.dt);
            }
            dataSeries.push({
                name: "Heating kWh", data: heating, type: "column", yAxis: 0,
            });
            dataSeries.push({
                name: "Hot Water kWh", data: hotWater, type: "column", yAxis: 1,
            });
        },
        error(xhr) {
            console.log(xhr);
        },
        cache: false,
    });
}
