# Pilot Deployment Archetypes

Reference deployment archetypes for different types of infrastructure operators.

## Archetype 1: National Water Utility

### Overview
Large-scale national water utility managing multiple river basins, reservoirs, and treatment facilities.

### Characteristics
- **Scale**: 50-200 infrastructure nodes
- **Sectors**: Water (primary), Power (dependency)
- **Protocols**: Modbus RTU/TCP, DNP3, OPC UA
- **Data Sources**: SCADA historians, Environment Agency APIs
- **Criticality**: High (public health, flood prevention)

### Data Mapping
- **Historian**: OSIsoft PI, Wonderware, or similar
- **CSV Schema**: `timestamp,node_id,value,quality`
- **Protocols**: Modbus (pumps), DNP3 (reservoirs), OPC UA (treatment)
- **Update Frequency**: 1-5 minutes
- **Retention**: 1 year minimum

### Key Use Cases
1. Flood event response (Carlisle-style)
2. Drought management
3. Water quality incidents
4. Pump station failures
5. Reservoir level management

### Configuration Template
```yaml
archetype: national_water_utility
jurisdiction: UK
sectors:
  - water
  - power
protocols:
  - modbus
  - dnp3
  - opc_ua
data_sources:
  - type: historian
    format: csv
    schema: timestamp,node_id,value,quality
  - type: api
    provider: environment_agency
    endpoints:
      - river_levels
      - rainfall
deployment_mode: pilot
shadow_mode:
  enabled: true
  duration_days: 365
```

## Archetype 2: Regional Grid Operator

### Overview
Regional electricity grid operator managing transmission and distribution networks.

### Characteristics
- **Scale**: 100-500 infrastructure nodes
- **Sectors**: Power (primary), Water (cooling dependency)
- **Protocols**: IEC 61850, DNP3, Modbus
- **Data Sources**: SCADA systems, PMU data
- **Criticality**: Critical (national security)

### Data Mapping
- **Historian**: OSIsoft PI, eDNA, or similar
- **CSV Schema**: `timestamp,substation_id,voltage,current,frequency,status`
- **Protocols**: IEC 61850 (substations), DNP3 (RTUs), Modbus (IEDs)
- **Update Frequency**: Sub-second (PMU), 1-5 seconds (SCADA)
- **Retention**: 1 year minimum

### Key Use Cases
1. Frequency instability events
2. Substation failures
3. Load shedding coordination
4. Grid restoration
5. CMI prioritization (war-emergency)

### Configuration Template
```yaml
archetype: regional_grid_operator
jurisdiction: EU
sectors:
  - power
  - water
protocols:
  - iec61850
  - dnp3
  - modbus
data_sources:
  - type: scada
    format: csv
    schema: timestamp,substation_id,voltage,current,frequency
  - type: pmu
    format: csv
    schema: timestamp,pmu_id,phasor_data
deployment_mode: production
cmi:
  enabled: true
  emergency_levels:
    - peacetime
    - minor_incident
    - major_incident
    - national_emergency
```

## Archetype 3: Smart City Control

### Overview
Smart city infrastructure managing multiple sectors (traffic, water, power, emergency services).

### Characteristics
- **Scale**: 200-1000 infrastructure nodes
- **Sectors**: Multiple (traffic, water, power, emergency)
- **Protocols**: OPC UA, BACnet, Modbus, MQTT
- **Data Sources**: IoT sensors, SCADA, cloud APIs
- **Criticality**: Medium-High (public safety, economic impact)

### Data Mapping
- **Historian**: Time-series databases (InfluxDB, TimescaleDB)
- **CSV Schema**: `timestamp,sensor_id,value,location,type`
- **Protocols**: OPC UA (industrial), BACnet (buildings), MQTT (IoT)
- **Update Frequency**: 1-60 seconds
- **Retention**: 90 days minimum

### Key Use Cases
1. Multi-sector coordination
2. Emergency response
3. Traffic management
4. Energy optimization
5. Public safety incidents

### Configuration Template
```yaml
archetype: smart_city_control
jurisdiction: EU
sectors:
  - traffic
  - water
  - power
  - emergency_services
protocols:
  - opc_ua
  - bacnet
  - modbus
  - mqtt
data_sources:
  - type: iot_sensors
    format: csv
    schema: timestamp,sensor_id,value,location
  - type: scada
    format: csv
    schema: timestamp,node_id,value
deployment_mode: pilot
shadow_mode:
  enabled: true
  duration_days: 180
```

## Data Mapping Templates

### Template: Modbus RTU/TCP
```csv
timestamp,device_address,function_code,address,value,quality
2026-01-15T12:00:00Z,1,3,40001,1234.5,GOOD
```

### Template: DNP3
```csv
timestamp,object_group,object_variation,index,value,quality
2026-01-15T12:00:00Z,30,1,0,123.45,GOOD
```

### Template: OPC UA
```csv
timestamp,node_id,data_type,value,status_code
2026-01-15T12:00:00Z,ns=2;s=PressureSensor1,Double,45.67,Good
```

### Template: Environment Agency API
```json
{
  "items": [
    {
      "@id": "http://environment.data.gov.uk/flood-monitoring/id/stations/764080",
      "label": "Eden Sands Centre",
      "measures": {
        "latestReading": {
          "value": 0.498,
          "dateTime": "2015-12-05T00:00:00Z"
        }
      }
    }
  ]
}
```

## Deployment Checklist

### Pre-Deployment
- [ ] Identify infrastructure nodes and sectors
- [ ] Map data sources and protocols
- [ ] Configure protocol translators
- [ ] Set up data ingestion
- [ ] Configure playbooks
- [ ] Set up shadow mode (if pilot)

### Deployment
- [ ] Install Munin Edge Node
- [ ] Configure data diode (if air-gapped)
- [ ] Initialize engine pipeline
- [ ] Verify data ingestion
- [ ] Test graph inference
- [ ] Verify incident simulation
- [ ] Test handshake generation

### Post-Deployment
- [ ] Monitor shadow mode metrics
- [ ] Review incident detections
- [ ] Validate playbook recommendations
- [ ] Collect operator feedback
- [ ] Generate value reports
- [ ] Plan transition to active mode

## Next Steps

See [Pilot-in-a-Box Guide](./pilot-in-a-box.md) for complete deployment package.
