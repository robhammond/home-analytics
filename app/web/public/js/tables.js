function loadUsageTable(unit, startDate, endDate, filter) {
    $.ajax({
        url: '/api/usage/main',
        type: "GET",
        data: {
            start: startDate,
            end: endDate,
            unit: unit,
            filter: filter,
        },
        dataType: "json",
        success: function (res) {
            reversed_array = res.data.reverse();
            let count = 0;
            for (let row of reversed_array) {
                $('#usageDataTable').append(`<tr><td>${row.dt}</td><td style="text-align:right">${row.kwh}</td>
                    <td style="text-align:right">${row.kwh_exported}</td>
                    <td style="text-align:right">£${row.net_cost.toFixed(2)}</td></tr>`);
                count++;
            }
            let totals = res.totals;
            $('#totalkWh').html(`
                <div class="card border-left-primary shadow h-100 py-2">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">kWh</div>
                                <div class="h5 mb-0 font-weight-bold text-gray-800"><i class="fas fa-down-long"></i> ${Number(totals["kwh"].toFixed(0)).toLocaleString()} / <i class="fas fa-up-long"></i> ${Number(totals["kwh_exported"].toFixed(0)).toLocaleString()}</div>
                            </div>
                            <div class="col-auto">
                                <i class="fas fa-bolt fa-2x text-gray-300"></i>
                            </div>
                        </div>
                    </div>
                </div>`);
            let net_cost = "";
            if (totals["net_cost"] != totals["cost"]) {
                net_cost = ` <span style="color:grey;">(&pound;${totals["net_cost"].toFixed(2)} net)</span>`;
            }
            $('#totalCost').html(`
            <div class="card border-left-success shadow h-100 py-2">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                total cost</div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">&pound;${Number(totals["cost"].toFixed(2)).toLocaleString()}${net_cost}</div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-bolt fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        `);
            $('#avgkWh').html(`
                <div class="card border-left-info shadow h-100 py-2">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                    average kWh</div>
                                <div class="h5 mb-0 font-weight-bold text-gray-800">${Number((totals["kwh"] / count).toFixed(2)).toLocaleString()}</div>
                            </div>
                            <div class="col-auto">
                                <i class="fas fa-bolt fa-2x text-gray-300"></i>
                            </div>
                        </div>
                    </div>
                </div>
            `);
            $('#avgCost').html(`
            <div class="card border-left-warning shadow h-100 py-2">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                average cost</div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">&pound;${Number((totals["net_cost"] / count).toFixed(2)).toLocaleString()}</div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-bolt fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        `);
        },
        error: function (xhr) {
            console.log(xhr);
        },
        cache: false
    });
}

function loadUsageByRateTable(startDate, endDate, targetTable) {
    $.ajax({
        url: "/api/usage/by-rate",
        data: {
            start: startDate,
            end: endDate
        },
        method: "GET",
        success: function (res) {
            for (let r of res.rates) {
                $(targetTable + ' tbody.kwh').append('<tr class="pi-data-row"><td>'
                    + r.rate_type[0].toUpperCase() + r.rate_type.substring(1) +
                    '</td><td align="right">' + r.total_kwh.toFixed(2) + '</td></tr>');
                $(targetTable + ' tbody.cost').append('<tr class="pi-data-row"><td>'
                    + r.rate_type[0].toUpperCase() + r.rate_type.substring(1) +
                    '</td><td align="right">£' + r.total_cost.toFixed(2) + '</td></tr>');
            }
            $(targetTable + ' .kwh-total').html(res.totals.kwh.toFixed(2));
            $(targetTable + ' .cost-total').html("£" + res.totals.cost.toFixed(2));
        }
    });
}

function loadUsageBreakdown(startDate, endDate) {
    $.ajax({
        url: '/api/usage/breakdown/by-device',
        type: "GET",
        data: {
            start: startDate,
            end: endDate,
        },
        dataType: "json",
        success: function (res) {
            let row_data = [];
            for (let row of res.data) {
                row_data.push({ name: row.name, device: row.device, kwh: row.kwh });
            }
            for (let u of row_data) {
                let device = u.device || "";
                $("#usageBreakdown").append(`<tr><td>${device}</td><td>${u.name}</td><td>${u.kwh}</td></tr>`);
            }
        },
        error: function (xhr) {
            console.log(xhr);
        },
        cache: false
    });
}
