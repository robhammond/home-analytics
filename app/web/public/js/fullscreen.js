// https://developer.apple.com/design/human-interface-guidelines/foundations/color/
Highcharts.setOptions({
    colors: ['#43D158', '#F6453A', '#F99F0D', '#64D2FF', '#F5375F', '#BF5AF3', '#AC8E68']
});

function loadUsagePie(renderDiv, start, end) {
    let pieData = [];
    $.ajax({
        url: '/api/usage/breakdown',
        type: "GET",
        data: {
            start: start,
            end: end,
        },
        dataType: "json",
        success: function(res) {
            for (let row of res.data) {
                pieData.push({name: row.name, y: row.kwh});
            }

            let usagePie = Highcharts.chart({
                chart: {
                    renderTo: renderDiv,
                    type: 'pie',
                    backgroundColor: 'black',
                    plotBorderWidth: 0,
                    plotShadow: false,
                },
                credits: false,
                legend: {
                    align: 'right',
                    layout: 'vertical',
                    verticalAlign: 'middle',
                    itemStyle: {
                        color: "white",
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
                            color: 'white'
                        }
                    },
                },
                series: [{
                    name: "Usage Type",
                    data: pieData,
                    innerSize: "50%",
                }]
            });
        },
        error: function(xhr) {
            console.log(xhr);
        },
        cache: false
    });
}

function loadUsage7Day() {
    $.ajax({
        url: '/api/usage/days',
        type: "GET",
        data : {
            num: 7
        },
        dataType: "json",
        success: function(res) {
            let kwh = [];
            let cost = [];
            let xaxis = [];
            for (let row of res.data) {
                kwh.push(row.total_kwh);
                cost.push(row.total_rate);
                xaxis.push(row.dow);
            }

            let usage7day = Highcharts.chart({
                chart: {
                    renderTo: 'usage7day',
                    zoomType: 'xy',
                    backgroundColor: 'black',
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
                        borderWidth: 0,
                        dataLabels: {
                            enabled: true,
                            color: 'white'
                        }
                    }
                },
                legend: {
                    itemStyle: {
                        color: 'white',
                        fontWeight: 'normal',
                        fontSize: '14px',
                        align: 'right'
                    }
                },
                xAxis : {
                    title: {
                        text: ""
                    },
                    labels: {
                        style: {
                            color: "white",
                        }
                    },
                    categories: xaxis,
                },
                yAxis : [{
                    title: {
                        text: "kWh",
                        style: {
                            color: "white"
                        }
                    },
                    labels: {
                        style: {
                            color: "white",
                        }
                    },
                    gridLineWidth: 0,
                },{
                    title: {
                        text: "Cost",
                        style: {
                            color: "white"
                        }
                    },
                    labels: {
                        format: '£{value}',
                        style: {
                            color: "white",
                        }
                    },
                    opposite: true,
                    gridLineWidth: 0,
                }],
                series: [
                    {
                        name: "kWh",
                        type: "column",
                        data: kwh,
                        yAxis: 0
                    },
                    {
                        name: "Cost",
                        type: "column",
                        lineWidth: 5,
                        data: cost,
                        yAxis: 1,
                        dataLabels: {
                            format: "£{y}"
                        }
                    }
                ]
            });
        },
        error: function(xhr) {
            console.log(xhr);
        },
        cache: false
    });
}

function loadTodayUsage(date1, date2) {
    $.ajax({
        url: '/api/usage/hourly/compare',
        type: "GET",
        data : {
            date1: date1,
            date2: date2,
        },
        dataType: "json",
        success: function(res) {
            let d1 = [];
            let d2 = [];
            for (let row of res.data) {
                d1.push(row.kwh_yd);
                d2.push(row.kwh_td);
            }

            let todayUsage = Highcharts.chart({
                chart: {
                    renderTo: 'todayUsage',
                    type: 'column',
                    backgroundColor: 'black',
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
                        color: 'white',
                        fontWeight: 'normal',
                        fontSize: '14px',
                        align: 'right'
                    }
                },
                xAxis : {
                    title: {
                        text: "Hour",
                        style: {
                            color: "white"
                        }
                    },
                    labels: {
                        style: {
                            color: "white",
                        }
                    }
                },
                yAxis : {
                    title: {
                        text: "kWh",
                        style: {
                            color: "white"
                        }
                    },
                    labels: {
                        style: {
                            color: "white",
                        }
                    },
                    gridLineWidth: 0,
                },
                series: [
                    {name: "Yesterday", data: d1},
                    {name: "Today", data: d2}
                ],
            });
        },
        error: function(xhr) {
            console.log(xhr);
        },
        cache: false
    });
}

function loadTodayUsagev2(date1, date2) {
    $.ajax({
        url: '/api/usage/sum',
        type: "GET",
        dataType: "json",
        data: {
            start: date1,
            end: date1
        },
        success: function(res) {
            let kwh = Number(res["totals"]["kwh"].toFixed(1));
            let cost = res["totals"]["cost"];
            $('.todayCostBig').html(`<span class="align-middle">£${cost.toFixed(2)}</span>`);

            let gaugeOptions = {
                chart: {
                    type: 'solidgauge',
                    backgroundColor: 'black',
                },
                title: null,
                pane: {
                    center: ['50%', '85%'],
                    size: '115%',
                    startAngle: -90,
                    endAngle: 90,
                    background: {
                        backgroundColor:
                            Highcharts.defaultOptions.legend.backgroundColor || '#EEE',
                        innerRadius: '60%',
                        outerRadius: '100%',
                        shape: 'arc'
                    }
                },
                tooltip: {
                    enabled: false
                },
                yAxis: {
                    stops: [
                        [0.1, '#55BF3B'], // green
                        [0.5, '#DDDF0D'], // yellow
                        [0.7, '#DF5353'] // red
                    ],
                    lineWidth: 0,
                    tickWidth: 0,
                    minorTickInterval: null,
                    tickAmount: 2,
                    title: {
                        y: -90
                    },
                    labels: {
                        y: 16
                    }
                },
                plotOptions: {
                    solidgauge: {
                        dataLabels: {
                            y: 5,
                            borderWidth: 0,
                            useHTML: true
                        }
                    }
                },
            };
            let chartKwh = Highcharts.chart('container-kwh', Highcharts.merge(gaugeOptions, {
                yAxis: {
                    min: 0,
                    max: 25,
                    title: {
                        text: ''
                    }
                },
                credits: {
                    enabled: false
                },
                series: [{
                    name: 'kWh',
                    data: [kwh],
                    dataLabels: {
                        y: -110,
                        format:
                            '<div style="text-align:center">' +
                            '<span style="font-size:70px">{y}</span><br/>' +
                            '<span style="font-size:30px;opacity:0.8">kWh</span>' +
                            '</div>',
                        
                    },
                    tooltip: {
                        valueSuffix: ' kWh'
                    }
                }]
            }));
        },
        error: function(xhr) {
            console.log(xhr);
        },
        cache: false
    });
}

function loadCarCharging(unit, start, end) {
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
            let xCats = [];
            for (let row of res.data) {
                kwh.push(row.kwh);
                cost.push(row.cost);
                xCats.push(row.dt);
            }

            let carCharging = Highcharts.chart({
                chart: {
                    renderTo: 'carCharging',
                    type: 'column',
                    backgroundColor: 'black',
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
                        borderWidth: 0,
                        dataLabels: {
                            enabled: true,
                            color: 'white'
                        }
                    }
                },
                legend: {
                    itemStyle: {
                        color: 'white',
                        fontWeight: 'normal',
                        fontSize: '14px',
                        align: 'right'
                    }
                },
                xAxis : {
                    labels: {
                        style: {
                            color: "white",
                        }
                    },
                    categories: xCats
                },
                yAxis : {
                    title: {
                        text: "kWh",
                        style: {
                            color: "white"
                        }
                    },
                    labels: {
                        style: {
                            color: "white",
                        }
                    },
                    gridLineWidth: 0,
                },
                series: [
                    {
                        name: "kWh",
                        data: kwh,
                    },
                    {
                        name: "Cost",
                        data: cost,
                        dataLabels: {
                            format: "£{y}"
                        }
                    }
                ]
            });
            const momCostChange = (((cost[cost.length -1] - cost[cost.length -2]) / cost[cost.length - 2]) * 100).toFixed(0);
            const costHtml = `£${cost[cost.length -1].toFixed(0)} (${momCostChange}%)`;
            const momkWhChange = (((kwh[kwh.length -1] - kwh[kwh.length -2]) / kwh[kwh.length - 2]) * 100).toFixed(0);
            const kWhHtml = `${kwh[kwh.length -1].toFixed(0)} (${momkWhChange}%)`;
            const milesHtml = `${(kwh[kwh.length -1] * 4).toFixed(0)}`;

            $('#car-l3m-cost-total').append(costHtml);
            $('#car-l3m-kwh-total').append(kWhHtml);
            $('#car-l3m-miles-total').append(milesHtml);
        },
        error: function(xhr) {
            console.log(xhr);
        },
        cache: false
    });
}

function loadCarbonPie(renderDiv, start, end) {
    let pieData = [];
    $.ajax({
        url: '/api/carbon/breakdown',
        type: "GET",
        data: {
            start: start,
            end: end,
        },
        dataType: "json",
        success: function(res) {
            for (const [key, value] of Object.entries(res.data)) {
                if (value > 0) {
                    var name = key[0].toUpperCase() + key.substring(1);
                    pieData.push({name: name, y: value});
                }
            }

            let carbonPie = Highcharts.chart({
                chart: {
                    renderTo: renderDiv,
                    type: 'pie',
                    backgroundColor: 'black',
                    plotBorderWidth: 0,
                    plotShadow: false,
                },
                credits: false,
                legend: {
                    align: 'right',
                    layout: 'vertical',
                    verticalAlign: 'middle',
                    itemStyle: {
                        color: "white",
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
                        showInLegend: false,
                        // borderWidth: 0,
                        dataLabels: {
                            enabled: true,
                            // distance: -10,
                            style: {
                                fontWeight: 'normal',
                                color: 'white',
                                fontSize: '22px'
                            }
                        },
                    },
                    series: {
                        dataLabels: {
                            enabled: true,
                            color: 'white'
                        }
                    },
                },
                series: [{
                    name: "Generation Type",
                    data: pieData,
                    innerSize: "50%",
                }]
            });
        },
        error: function(xhr) {
            console.log(xhr);
        },
        cache: false
    });
}

function loadCarbonLine(date1, date2, label_format) {
    $.ajax({
        url: '/api/carbon/main',
        type: "GET",
        data : {
            date1: date1,
            date2: date2,
            label_format: label_format,
        },
        dataType: "json",
        success: function(res) {
            let forecast = [];
            let xCats = [];
            for (let row of res.data) {
                forecast.push(row.forecast);
                xCats.push(row.dt);
            }

            let carbonLine = Highcharts.chart({
                chart: {
                    renderTo: 'carbonLine',
                    type: 'column',
                    backgroundColor: 'black',
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
                    // itemStyle: {
                    //     color: 'white',
                    //     fontWeight: 'normal',
                    //     fontSize: '14px',
                    //     align: 'right'
                    // },
                    enabled: false
                },
                xAxis : {
                    categories: xCats,
                    labels: {
                        style: {
                            color: "white",
                        }
                    }
                },
                yAxis : {
                    title: {
                        text: "Forecast",
                        style: {
                            color: "white"
                        }
                    },
                    labels: {
                        style: {
                            color: "white",
                        }
                    },
                    gridLineWidth: 0,
                },
                series: [
                    {name: "carbon", data: forecast}
                ],
            });
        },
        error: function(xhr) {
            console.log(xhr);
        },
        cache: false
    });
}

function loadCarStatus() {
    $.ajax({
        url: '/api/vehicles/status',
        type: "GET",
        dataType: "json",
        success: function(res) {
            for (let car of res.data) {
                // battery viz
                // https://alvarotrigo.com/blog/progress-bar-css/
                let lockedViz='';
                if (car["isLocked"]) {
                    if (car["isLocked"] == 1) {
                        lockedViz=`<h2 class="car-locked"><span class="material-icons-outlined">lock</span> &nbsp;<span style="padding-bottom:5px;">Locked</span></h2>`;
                    } else if (car["isLocked"] == 1) {
                        lockedViz=`<h2 class="car-unlocked"><span class="material-icons-outlined">lock_open</span> &nbsp;Unlocked</h2>`;
                    }
                }
                let batteryViz = '';
                if (car["batteryPercent"] >= 90) {
                    batteryViz='<span class="material-icons carBatteryIcon battery-full">battery_full</span>';
                } else if (car["batteryPercent"] >= 80 && car["batteryPercent"] < 90) {
                    batteryViz='<span class="material-icons carBatteryIcon battery-6">battery_6_bar</span>';
                } else if (car["batteryPercent"] >= 65 && car["batteryPercent"] < 80) {
                    batteryViz='<span class="material-icons carBatteryIcon battery-5">battery_5_bar</span>';
                } else if (car["batteryPercent"] >= 50 && car["batteryPercent"] < 65) {
                    batteryViz='<span class="material-icons carBatteryIcon battery-4">battery_4_bar</span>';
                } else if (car["batteryPercent"] >= 35 && car["batteryPercent"] < 50) {
                    batteryViz='<span class="material-icons carBatteryIcon battery-3">battery_3_bar</span>';
                } else if (car["batteryPercent"] >= 25 && car["batteryPercent"] < 35) {
                    batteryViz='<span class="material-icons carBatteryIcon battery-2">battery_2_bar</span>';
                } else if (car["batteryPercent"] >= 10 && car["batteryPercent"] < 25) {
                    batteryViz='<span class="material-icons carBatteryIcon battery-1">battery_1_bar</span>';
                } else if (car["batteryPercent"] >= 0 && car["batteryPercent"] < 10) {
                    batteryViz='<span class="material-icons carBatteryIcon battery-0">battery_0_bar</span>';
                }
                $('#piInnerCarousel').append(`
                    <div class="carousel-item" data-bs-interval="10000">
                        <div class="row">
                            <div class="col-md-6">
                                <h1>${car['make']} ${car['model']}</h1>
                                <img src="${car['imageUrl']}" style="max-width:350px;max-height:400px;" />
                                <div class="row justify-content-md-center" style="margin-top:20px">
                                    <div class="col-md-10">
                                        <span class="reg-plate">${car['registrationNumber']}</span>
                                    </div>
                                </div>
                                <div style="margin-top:20px;margin-left:25px;">
                                    ${lockedViz}
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="row" style="margin-top:80px">
                                    <div class="col-md-3">
                                        ${batteryViz}
                                    </div>
                                    <div class="col-md-9">
                                        <div class="carInfo">${car["batteryPercent"]}%</div>
                                    </div>
                                </div>
                                <div class="row" style="margin-top:80px">
                                    <div class="col-md-3">
                                        <span class="material-icons carRouteIcon align-middle">route</span>
                                    </div>
                                    <div class="col-md-9">
                                        <div class="carInfo">${car["estimatedRange"]} mi</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `);
            }
        }
    });
}
