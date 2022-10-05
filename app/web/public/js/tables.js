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
            for (let row of reversed_array) {
                $('#usageDataTable').append(`<tr><td>${row.dt}</td><td style="text-align:right">${row.kwh}</td>
                    <td style="text-align:right">£${row.cost.toFixed(2)}</td></tr>`);
            }
            let totals = res.totals;
            $('#totalkWh').html(`${totals["kwh"].toFixed(0).toLocaleString()} kWh`);
            $('#totalCost').html(`£${totals["cost"].toFixed(2).toLocaleString()}`);
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