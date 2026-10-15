# Temperature change relative to the pre-industrial period - Data package

This data package contains the data that powers the chart ["Temperature change relative to the pre-industrial period"](https://ourworldindata.org/grapher/temperature-anomaly?time=earliest..2026&v=1&csvType=filtered&useColumnShortNames=false) on the Our World in Data website.

### Active Filters

A filtered subset of the full data was downloaded. The following filters were applied:
- time: earliest..2026

## CSV structure

Each row is an observation for an entity (usually a country or region) at a timepoint.

- "Entity" — the name of the entity, e.g. "United States".
- "Code" — our internal entity code. For most countries this is the [ISO alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3) code, e.g. "USA"; historical and other non-standard entities get a custom code.
- "Year" or "Day" — the timepoint. Annual data has a "Year" column holding an integer year; otherwise a "Day" column holds a date string in the form "YYYY-MM-DD".
- Every remaining column is a data column, each one a time series. Downloaded with the "full data" option each corresponds to one time series below; with "only selected data visible in the chart" they are transformed depending on the chart type, so the correspondence may be less direct.


## Metadata.json structure

The .metadata.json file contains metadata about the data package. The "charts" key contains information to recreate the chart, like the title, subtitle etc. The "columns" key contains information about each of the columns in the csv, like the unit, timespan covered, citation for the data etc.

## How we process data at Our World in Data

Our World in Data is almost never the original producer of the data - almost all of the data we use has been compiled by others. If you want to re-use data, it is your responsibility to ensure that you adhere to the sources' license and to credit them correctly. Please note that a single time series may have more than one source - e.g. when we stitch together data from different time periods by different producers or when we calculate per capita metrics using population data from a second source.

Preparing this data involves several processing steps. Depending on the data, this can include standardizing country names and world region definitions, converting units, calculating derived indicators such as per capita measures, as well as adding or adapting metadata such as the name or the description given to an indicator.
[Read about our data pipeline](https://docs.owid.io/projects/etl/).

## Detailed information about each time series


### Global average temperature anomaly relative to 1861-1890
Difference in average land-sea surface temperature compared to the 1861-1890 mean, in degrees Celsius.
Last updated: September 11, 2026  
Next expected update: November 2026  
Date range: 1850–2026  
Unit: degrees Celsius  
Source: Met Office Hadley Centre – HadCRUT5 (2026) – with major processing by Our World in Data  

#### How to cite this data

Met Office Hadley Centre – HadCRUT5 (2026) – with major processing by Our World in Data

#### What you should know about this data
- Temperature anomalies show how many degrees Celsius temperatures have changed compared to the 1861-1890 period. This baseline period is commonly used to highlight the changes in temperature since pre-industrial times, prior to major human impacts.
- Temperature averages and anomalies are calculated over all land and ocean surfaces.
- The data includes separate measurements for the Northern and Southern Hemispheres, which helps researchers analyze regional differences.
- The global temperature anomaly is the average of both hemisphere measurements.
- This data is based on the HadCRUT5 method. This method averages temperature measurements onto a fixed grid. If no data is available for a grid cell, it remains empty and adds extra uncertainty when calculating averages like the global mean.
- Despite different approaches, HadCRUT5 and other methods show similar global temperature trends.

#### How this data is described by its producers
The 1961-90 period is most often used as a baseline because it is the period recommended by the World Meteorological Organisation. In some cases other periods are used. For global average temperatures, an 1861-1890 period is sometimes used to show the warming since the "pre-industrial" period.

#### Notes on our processing step for this indicator
- We switch from using 1961-1990 to using 1861-1890 as our baseline to better show how temperatures have changed since pre-industrial times.
- For each region, we calculate the mean temperature anomalies for 1961-1990 and for 1861-1890. The difference between these two means serves as the adjustment factor.
- This factor is applied uniformly to both the temperature anomalies and the confidence intervals to ensure that both the central values and the associated uncertainty bounds are correctly shifted relative to the new 1861-1890 baseline.


### Lower bound of the annual temperature anomaly (95% confidence interval)
Last updated: September 11, 2026  
Next expected update: November 2026  
Date range: 1850–2026  
Unit: degrees Celsius  
Source: Met Office Hadley Centre – HadCRUT5 (2026) – with major processing by Our World in Data  

#### How to cite this data

Met Office Hadley Centre – HadCRUT5 (2026) – with major processing by Our World in Data

#### What you should know about this data
- Temperature anomalies show how many degrees Celsius temperatures have changed compared to the 1861-1890 period. This baseline period is commonly used to highlight the changes in temperature since pre-industrial times, prior to major human impacts.
- Temperature averages and anomalies are calculated over all land and ocean surfaces.
- The data includes separate measurements for the Northern and Southern Hemispheres, which helps researchers analyze regional differences.
- The global temperature anomaly is the average of both hemisphere measurements.
- This data is based on the HadCRUT5 method. This method averages temperature measurements onto a fixed grid. If no data is available for a grid cell, it remains empty and adds extra uncertainty when calculating averages like the global mean.
- Despite different approaches, HadCRUT5 and other methods show similar global temperature trends.

#### How this data is described by its producers
The 1961-90 period is most often used as a baseline because it is the period recommended by the World Meteorological Organisation. In some cases other periods are used. For global average temperatures, an 1861-1890 period is sometimes used to show the warming since the "pre-industrial" period.

#### Notes on our processing step for this indicator
- We switch from using 1961-1990 to using 1861-1890 as our baseline to better show how temperatures have changed since pre-industrial times.
- For each region, we calculate the mean temperature anomalies for 1961-1990 and for 1861-1890. The difference between these two means serves as the adjustment factor.
- This factor is applied uniformly to both the temperature anomalies and the confidence intervals to ensure that both the central values and the associated uncertainty bounds are correctly shifted relative to the new 1861-1890 baseline.


### Upper bound of the annual temperature anomaly (95% confidence interval)
Last updated: September 11, 2026  
Next expected update: November 2026  
Date range: 1850–2026  
Unit: degrees Celsius  
Source: Met Office Hadley Centre – HadCRUT5 (2026) – with major processing by Our World in Data  

#### How to cite this data

Met Office Hadley Centre – HadCRUT5 (2026) – with major processing by Our World in Data

#### What you should know about this data
- Temperature anomalies show how many degrees Celsius temperatures have changed compared to the 1861-1890 period. This baseline period is commonly used to highlight the changes in temperature since pre-industrial times, prior to major human impacts.
- Temperature averages and anomalies are calculated over all land and ocean surfaces.
- The data includes separate measurements for the Northern and Southern Hemispheres, which helps researchers analyze regional differences.
- The global temperature anomaly is the average of both hemisphere measurements.
- This data is based on the HadCRUT5 method. This method averages temperature measurements onto a fixed grid. If no data is available for a grid cell, it remains empty and adds extra uncertainty when calculating averages like the global mean.
- Despite different approaches, HadCRUT5 and other methods show similar global temperature trends.

#### How this data is described by its producers
The 1961-90 period is most often used as a baseline because it is the period recommended by the World Meteorological Organisation. In some cases other periods are used. For global average temperatures, an 1861-1890 period is sometimes used to show the warming since the "pre-industrial" period.

#### Notes on our processing step for this indicator
- We switch from using 1961-1990 to using 1861-1890 as our baseline to better show how temperatures have changed since pre-industrial times.
- For each region, we calculate the mean temperature anomalies for 1961-1990 and for 1861-1890. The difference between these two means serves as the adjustment factor.
- This factor is applied uniformly to both the temperature anomalies and the confidence intervals to ensure that both the central values and the associated uncertainty bounds are correctly shifted relative to the new 1861-1890 baseline.


## Sources

These are the sources behind the data in this package. Each time series above names the ones it draws on in its citation.

### Met Office Hadley Centre – HadCRUT5

The HadCRUT5 near surface temperature data set is produced by blending data from the CRUTEM5 surface air temperature dataset and the HadSST4 sea-surface temperature dataset.

Temperature anomalies are based on the HadCRUT5 near-surface temperature dataset as published by the Met Office Hadley Centre.

Producer: Met Office Hadley Centre  
Published: 2026-09-07  
Retrieved on: 2026-09-11  
Retrieved from: https://www.metoffice.gov.uk/hadobs/hadcrut5/  
Direct download: https://www.metoffice.gov.uk/hadobs/hadcrut5/data/HadCRUT.5.1.0.0/analysis/diagnostics/HadCRUT.5.1.0.0.analysis.summary_series.global.annual.csv  
License: Open Government License v3 (https://www.metoffice.gov.uk/hadobs/hadcrut5/terms_and_conditions.html)  

Citation: Morice, C. P., Kennedy, J. J., Rayner, N. A., Winn, J. P., Hogan, E., Killick, R. E., et al. (2021). An updated assessment of near-surface temperature change from 1850: the HadCRUT5 data set. Journal of Geophysical Research: Atmospheres, 126, e2019JD032361. [doi:10.1029/2019JD032361](https://www.metoffice.gov.uk/hadobs/hadcrut5/HadCRUT5_accepted.pdf) ([supporting information](https://www.metoffice.gov.uk/hadobs/hadcrut5/HadCRUT5_supporting_information_accepted.pdf)).

    