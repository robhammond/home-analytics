Highcharts.setOptions({
    colors: ['#43D158', '#F6453A', '#F99F0D', '#64D2FF', '#F5375F', '#BF5AF3', '#AC8E68', '#FFD525', '#66D3CF']
});

function loadUsagePie(startDate, endDate) {
    let usagePie = Highcharts.chart({
        chart: {
            renderTo: 'usagePie',
            type: 'pie',
            backgroundColor: 'white',
            plotBorderWidth: 0,
            plotShadow: false,
        },
        credits: false,
        legend: {
            align: 'right',
            layout: 'vertical',
            verticalAlign: 'middle',
            itemStyle: {
                color: "black",
                fontSize: "22px",
                fontWeight: "normal",
            },
            itemMarginTop: 10,
            itemMarginBottom: 10,
        },
        title: {
            text: ''
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: false
                },
                showInLegend: true,
                // borderWidth: 0,
            },
            series: {
                dataLabels: {
                    enabled: true,
                    color: 'black'
                }
            }
        }
    });
    
    $.ajax({
        url: '/api/usage/breakdown',
        type: "GET",
        data: {
            start: startDate,
            end: endDate,
        },
        dataType: "json",
        success: function(res) {
            let row_data = [];
            for (let row of res.data) {
                row_data.push({name: row.name, y: row.kwh});
            }
            usagePie.addSeries({name: "kWh", data: row_data, innerSize: "50%"});
        },
        error: function(xhr) {
            console.log(xhr);
        },
        cache: false
    });
}

function loadUsageMain(unit, startDate, endDate, filter) {

    let dataSeries = [];
    let xAxisCats = [];
    $.ajax({
        url: '/api/usage/main',
        type: "GET",
        data : {
            start: startDate,
            end: endDate,
            unit: unit,
            filter: filter,
        },
        dataType: "json",
        success: function(res) {
            let kwh = [];
            let cost = [];
            for (let row of res.data) {
                kwh.push(row.kwh);
                cost.push(row.cost);
                xAxisCats.push(row.dt);
            }
            dataSeries.push({name: "kWh", data: kwh, type: 'column', yAxis: 0});
            dataSeries.push({name: "Cost", data: cost, type: 'line', yAxis: 1});

            let usageMain = Highcharts.chart({
                chart: {
                    // type: 'column',
                    renderTo: 'usageMain',
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
                        text: "Cost",
                    },
                    labels: {
                        format: '£{value}',
                    },
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

function loadTodayUsage(date1, date2) {
    let dataSeries = [];
    let xAxisCats = [];
    $.ajax({
        url: '/api/usage/hourly/compare',
        type: "GET",
        data : {
            date1: date1,
            date2: date2,
            unit: 'halfhour',
        },
        dataType: "json",
        success: function(res) {
            let d1 = [];
            let d2 = [];
            for (let row of res.data) {
                d1.push(row.kwh_yd);
                d2.push(row.kwh_td);
                xAxisCats.push(row.hour);
            }
            dataSeries.push({name: "Yesterday", data: d1});
            dataSeries.push({name: "Today", data: d2});

            let hourlyUsage = Highcharts.chart({
                chart: {
                    renderTo: 'hourlyUsage',
                    type: 'column',
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
                        color: 'black',
                        fontWeight: 'normal',
                        fontSize: '14px',
                        align: 'right'
                    }
                },
                xAxis : {
                    title: {
                        text: "Hour",
                        style: {
                            color: "black"
                        }
                    },
                    labels: {
                        style: {
                            color: "black",
                        }
                    },
                    categories: xAxisCats,
                },
                yAxis : {
                    title: {
                        text: "kWh",
                        style: {
                            color: "black"
                        }
                    },
                    labels: {
                        style: {
                            color: "black",
                        }
                    },
                    gridLineWidth: 0,
                },
                series: dataSeries,
            });
        },
        error: function(xhr) {
            console.log(xhr);
        },
        cache: false
    });
}



function loadCarCharging(unit, start, end) {
    let dataSeries = [];
    let xAxisCats = [];
    $.ajax({
        url: '/api/usage/vehicles',
        type: "GET",
        data : {
            start: start,
            end: end,
            unit: unit,
        },
        dataType: "json",
        success: function(res) {
            let kwh = [];
            let cost = [];
            for (let row of res.data) {
                kwh.push(row.kwh);
                cost.push(row.cost);
                xAxisCats.push(row.dt);
            }
            dataSeries.push({name: "kWh", data: kwh, type: 'column', yAxis: 0});
            dataSeries.push({name: "Cost", data: cost, type: 'column', yAxis: 1});

            let carCharging = Highcharts.chart({
                chart: {
                    renderTo: 'carCharging',
                    type: 'column',
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
                        text: ""
                    },
                    categories: xAxisCats
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
                        text: "Cost",
                    },
                    labels: {
                        format: '£{value}',
                    },
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

function loadHeatingChart(unit, startDate, endDate) {

    let dataSeries = [];
    let xAxisCats = [];
    $.ajax({
        url: '/api/usage/heating',
        type: "GET",
        data : {
            start: startDate,
            end: endDate,
            unit: unit,
        },
        dataType: "json",
        success: function(res) {
            let heating = [];
            let hotWater = [];
            for (let row of res.data) {
                heating.push(row.heating_kwh);
                hotWater.push(row.hot_water_kwh);
                xAxisCats.push(row.dt);
            }
            dataSeries.push({name: "Heating kWh", data: heating, type: 'column', yAxis: 0});
            dataSeries.push({name: "Hot Water kWh", data: hotWater, type: 'column', yAxis: 1});

            let heatingUsage = Highcharts.chart({
                chart: {
                    // type: 'column',
                    renderTo: 'heatingUsage',
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
                    categories: xAxisCats,
                },
                yAxis : [{
                    title: {
                        text: "Heating kWh",
                    },
                    labels: {
                    },
                    gridLineWidth: 0,
                },{
                    title: {
                        text: "Hot Water kWh",
                    },
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