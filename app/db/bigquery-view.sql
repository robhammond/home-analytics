-- Note: you may need to alter the rates table for this view to work
-- For instance, if you have a peak rate that runs from 04:30 to 00:30 
-- it complicates things, so add 2 peak rates from 00:00 to 00:30, then 04:30 to 23:59

WITH
  rates2 AS (
  SELECT
    rate_type,
    EXTRACT(hour
    FROM
      CAST(start_time AS time)) AS start_h,
    EXTRACT(minute
    FROM
      CAST(start_time AS time)) AS start_m,
    EXTRACT(hour
    FROM
      CAST(end_time AS time)) AS end_h,
    EXTRACT(minute
    FROM
      CAST(end_time AS time)) AS end_m,
    datetime_start,
    datetime_end,
    cost,
    standing_charge
  FROM
    home_analytics.rates )
SELECT
  name,
  category,
  kwh_consumed,
  unit,
  u.datetime_start,
  u.datetime_end,
  r.rate_type,
  r.cost AS rate_cost,
  case
    when name = 'Pod Point' THEN u.cost
    ELSE r.cost * kwh_consumed
  END AS cost,
  r.standing_charge
FROM
  home_analytics.usage_data u
FULL JOIN
  rates2 r
ON
  -- join against the right supplier
  (( u.datetime_start >= r.datetime_start
    AND u.datetime_end < r.datetime_end
  )
  OR ( u.datetime_start >= r.datetime_start
    AND r.datetime_end IS NULL 
    ))
  -- join against the right rate type
  AND (
    rate_type = 'fixed'
    OR
    ( 
      -- start is equal or after rate start
      DATETIME(u.datetime_start) >= DATETIME(EXTRACT(year
        FROM
          u.datetime_start), EXTRACT(month
        FROM
          u.datetime_start), EXTRACT(day
        FROM
          u.datetime_start), start_h, start_m, 0)
      AND 
      -- just add another row to the rates table to simplify this - ie 00:00->00:30 is one peak rate, 04:30->00:00 is another. bingo
      (
      DATETIME(u.datetime_end) <= DATETIME(EXTRACT(year
        FROM
          u.datetime_end), EXTRACT(month
        FROM
          u.datetime_end), EXTRACT(day
        FROM
          u.datetime_end), end_h, end_m, 0) ))
)
WHERE
  DATE(u.datetime_start) > '2020-01-01'
  -- and name = 'Total'