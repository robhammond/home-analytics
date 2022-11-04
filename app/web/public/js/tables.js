function loadUsageTable(unit, startDate, endDate, filter) {
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
            reversed_array = res.data.reverse();
            let count = 0;
            for (let row of reversed_array) {
                $('#usageDataTable').append(`<tr><td>${row.dt}</td><td style="text-align:right">${row.kwh}</td>
                    <td style="text-align:right">£${row.cost.toFixed(2)}</td></tr>`);
                count++;
            }
            let totals = res.totals;
            $('#totalkWh').html(`
                <div class="card border-info mb-3" style="max-width: 18rem;">
                <div class="card-header">Total kWh</div>
                <div class="card-body">
                    <h5 class="card-title" style="text-align:right;">${ Number(totals["kwh"].toFixed(2)).toLocaleString() }</h5>
                </div>
            </div>`);
            $('#totalCost').html(`
            <div class="card border-info mb-3" style="max-width: 18rem;">
                <div class="card-header">Total Cost</div>
                <div class="card-body">
                    <h5 class="card-title" style="text-align:right;">&pound;${ Number(totals["cost"].toFixed(2)).toLocaleString() }</h5>
                </div>
            </div>`);
            $('#avgkWh').html(`
                <div class="card border-info mb-3" style="max-width: 18rem;">
                <div class="card-header">Average kWh</div>
                <div class="card-body">
                    <h5 class="card-title" style="text-align:right;">${ Number((totals["kwh"] / count).toFixed(2)).toLocaleString() }</h5>
                </div>
            </div>`);
            $('#avgCost').html(`
            <div class="card border-info mb-3" style="max-width: 18rem;">
                <div class="card-header">Average Cost</div>
                <div class="card-body">
                    <h5 class="card-title" style="text-align:right;">&pound;${ Number((totals["cost"] / count).toFixed(2)).toLocaleString() }</h5>
                </div>
            </div>`);
        },
        error: function(xhr) {
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
        success: function(res) {
            for (let r of res.rates) {
                $(targetTable + ' tbody.kwh').append('<tr class="pi-data-row"><td>'
                    + r.rate_type[0].toUpperCase() + r.rate_type.substring(1) + 
                    '</td><td align="right">'+r.total_kwh.toFixed(2)+'</td></tr>');
                $(targetTable + ' tbody.cost').append('<tr class="pi-data-row"><td>'
                    + r.rate_type[0].toUpperCase() + r.rate_type.substring(1) + 
                    '</td><td align="right">£'+r.total_cost.toFixed(2)+'</td></tr>');
            }
            $(targetTable + ' .kwh-total').html(res.totals.kwh.toFixed(2));
            $(targetTable + ' .cost-total').html("£" + res.totals.cost.toFixed(2));
        }
    });
}