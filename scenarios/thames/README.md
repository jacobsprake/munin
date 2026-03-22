# Thames Catchment Scenario

## Data source

All data comes from the UK Environment Agency real-time flood monitoring API:

    https://environment.data.gov.uk/flood-monitoring

The API is public, open-data (OGL v3), and requires no authentication.

## Stations used

| Node ID              | Station ref | Location                        | River        |
|----------------------|-------------|---------------------------------|--------------|
| `thames_sandford`    | 1502TH      | Sandford-on-Thames (nr Oxford)  | River Thames |
| `thames_ditton`      | 3104TH      | Thames Ditton Island (nr Kingston) | River Thames |
| `thames_teddington`  | 3401TH      | Teddington Lock (tidal limit)   | River Thames |

These three gauges span roughly 80 km of the non-tidal Thames, from the
Oxford area downstream to the tidal limit at Teddington. All report water
level (stage) at 15-minute intervals.

## What the demo discovers

Munin's graph inference runs cross-correlation at multiple lag offsets across
the three time series. Because river flow propagates downstream, a rainfall
pulse or lock release at Sandford appears at Thames Ditton hours later, and
at Teddington later still. The detected lag is the physical water travel time
between gauges.

Expected findings (vary with flow conditions):

- **Sandford -> Ditton**: high correlation, lag on the order of several hours
- **Ditton -> Teddington**: high correlation, shorter lag (stations are closer)
- **Sandford -> Teddington**: correlation with the sum of the two upstream lags

During low-flow / dry-weather periods, the signal may be weak because water
levels are nearly flat. The strongest results come during or just after
rainfall events, when there is a clear pulse moving downstream.

## Running the demo

```bash
python -m engine demo thames
```

This fetches the most recent ~500 readings per station (approximately 5 days
at 15-minute resolution), aligns them, and runs shadow link discovery.

## Relationship to the Carlisle demo

The existing Carlisle demo uses rivers Eden and Petteril — tributaries that
converge within a few kilometres. The Thames demo tests the same algorithm on
a much longer reach with greater spatial separation, confirming that Munin's
dependency discovery generalises across different catchment geometries and
flow regimes.
