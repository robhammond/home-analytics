// https://developer.apple.com/design/human-interface-guidelines/foundations/color/
Highcharts.setOptions({
    colors: [
        '#43D158', 
        '#F6453A', 
        '#F99F0D', 
        '#64D2FF', 
        '#BF5AF3', 
        '#058DC7',
        '#64DF',
        '#DDDF00',
        '#24CBE5',
        '#FF9655',
        '#FFF263',
        '#6AF9C4'
    ]
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

function loadCarStatus() {
    $.ajax({
        url: '/api/vehicles/status',
        type: "GET",
        dataType: "json",
        success: function(res) {
            for (let car of res.data) {
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
                                <img src="${car['image_url']}" style="max-width:350px;max-height:400px;" />
                                <div class="row justify-content-md-center" style="margin-top:20px">
                                    <div class="col-md-10">
                                        <span class="reg-plate">${car['registration_number']}</span>
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
