function loadHeatingChart(unit, startDate, endDate, filter) {

    let dataSeries = [];
    let xAxisCats = [];
    $.ajax({
        url: '/api/usage/heating',
        type: "GET",
        data : {
            start: startDate,
            end: endDate,
            unit: unit,
            filter: filter,
        },
        dataType: "json",
        success: function(res) {
            let hot_water_kwh = [];
            let heating_kwh = [];
            let hot_water_cop = [];
            let heating_cop = [];
            for (let row of res.data) {
                hot_water_kwh.push(row.hot_water_kwh);
                heating_kwh.push(row.heating_kwh);
                hot_water_cop.push(row.hot_water_cop);
                heating_cop.push(row.heating_cop);
                xAxisCats.push(row.dt);
            }
            dataSeries.push(
                {name: "Hot Water kWh", data: hot_water_kwh, type: 'column', stacking: "normal", yAxis: 0},
                {name: "Central Heating kWh", data: heating_kwh, type: 'column', stacking: "normal", yAxis: 0}
            );
            dataSeries.push(
                {name: "Hot Water CoP", data: hot_water_cop, type: 'line', yAxis: 1},
                {name: "Central Heating CoP", data: heating_cop, type: 'line', yAxis: 1}
            );

            let usageMain = Highcharts.chart({
                chart: {
                    // type: 'column',
                    renderTo: 'heatingChart',
                    zoomType: 'xy',
                    backgroundColor: 'white',
                    plotBorderWidth: 0,
                    plotShadow: false,
                },
                credits: false,
                title: {
                    text: "",
                },
                plotOptions: {
                    column: {
                        pointPadding: 0.1,
                        borderWidth: 0
                    }
                },
                legend: {
                    itemStyle: {
                        fontWeight: 'normal',
                        fontSize: '14px',
                        align: 'right'
                    }
                },
                xAxis : {
                    title: {
                        text: "Day",
                    },
                    labels: {
                    },
                    categories: xAxisCats,
                },
                yAxis : [{
                    title: {
                        text: "kWh",
                    },
                    labels: {
                    },
                    gridLineWidth: 0,
                },{
                    title: {
                        text: "CoP",
                    },
                    labels: {},
                    opposite: true,
                    gridLineWidth: 0,
                }],
                series: dataSeries
            });
        },
        error: function(xhr) {
            console.log(xhr);
        },
        cache: false
    });
}