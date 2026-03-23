# Hardware Sizing Guidance

Recommended hardware configurations for different deployment scales.

## Small Deployment (< 1,000 nodes)

- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **Network**: 1Gbps

## Medium Deployment (1,000 - 10,000 nodes)

- **CPU**: 8 cores
- **RAM**: 16GB
- **Storage**: 500GB SSD
- **Network**: 1Gbps

## Large Deployment (10,000 - 50,000 nodes)

- **CPU**: 16 cores
- **RAM**: 32GB
- **Storage**: 1TB SSD
- **Network**: 10Gbps

## National-Scale Deployment (50,000+ nodes)

- **CPU**: 32+ cores
- **RAM**: 64GB+
- **Storage**: 2TB+ SSD (RAID)
- **Network**: 10Gbps+

## Performance Tuning

- Enable parallel correlation computation (`n_jobs` parameter)
- Use sparse time-series for mostly-empty sensors
- Enable downsampling for exploratory analysis
- Use fast-approximate correlation mode for large graphs
