import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { scaleQuantile } from 'd3-scale';
import { Tooltip } from 'react-tooltip';
import indiaTopo from './assets/india-states.json';

const PROJECTION_CONFIG = {
    scale: 1100,
    center: [78.9629, 22.5937] // Centered on India
};

const IndiaMap = ({ stateData, activeState, secondaryState, onStateSelect }) => {
    const [tooltipContent, setTooltipContent] = React.useState("");


    // Prepare data for the map
    // Calculate total enrolment for each state to drive the color scale
    const mapData = useMemo(() => {
        const data = {};
        if (!stateData) return data;

        Object.keys(stateData).forEach(state => {
            const breakdown = stateData[state].district_breakdown || [];
            const total = breakdown.reduce((acc, curr) => acc + (curr.total || 0), 0);
            data[state] = total;
        });
        return data;
    }, [stateData]);

    const colorScale = useMemo(() => {
        const values = Object.values(mapData).filter(v => v > 0);
        return scaleQuantile()
            .domain(values)
            .range([
                "#94a3b8", // light grey for lowest
                "#64748b",
                "#475569",
                "#334155",
                "#1e293b"  // darkest grey/black for highest
            ]);
    }, [mapData]);

    // Helper to normalize map names to match data keys
    const normalizeMapName = (name) => {
        if (!name) return "";
        name = name.replace(/&/g, 'and');
        const mapping = {
            "Telangana": "Telangana",
            "Andaman and Nicobar Islands": "Andaman And Nicobar Islands",
            "Arunachal Pradesh": "Arunachal Pradesh",
            "Dadra and Nagar Haveli": "Dadra and Nagar Haveli and Daman and Diu",
            "Daman and Diu": "Dadra and Nagar Haveli and Daman and Diu",
            "Jammu and Kashmir": "Jammu and Kashmir",
            "NCT of Delhi": "Delhi",
            "Odisha": "Odisha",
            "Puducherry": "Puducherry",
            "West Bengal": "West Bengal"
        };
        // Try direct match or mapping
        return mapping[name] || name;
    };

    return (
        <div className="india-map-container" data-tooltip-id="map-tooltip">
            <ComposableMap
                projection="geoMercator"
                projectionConfig={PROJECTION_CONFIG}
                width={800}
                height={650} // Aspect ratio adjustment
                style={{ width: "100%", height: "auto" }}
            >
                <Geographies geography={indiaTopo}>
                    {({ geographies }) =>
                        geographies.map((geo) => {
                            const current = geo.properties.name;
                            const dataName = normalizeMapName(current);
                            const value = mapData[dataName];
                            const isSelected = activeState === dataName;
                            const isSecondary = secondaryState === dataName;

                            return (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    fill={value ? colorScale(value) : "#cbd5e1"} // default light grey
                                    stroke={isSelected ? "#facc15" : isSecondary ? "#3b82f6" : "#fff"} // Yellow (Pri) or Blue (Sec), white borders
                                    strokeWidth={isSelected || isSecondary ? 2 : 0.5}
                                    style={{
                                        default: { outline: "none" },
                                        hover: { fill: "#facc15", outline: "none", cursor: "pointer" }, // Accent yellow on hover
                                        pressed: { outline: "none" }
                                    }}
                                    onMouseEnter={() => {
                                        const name = geo.properties.name;
                                        const val = mapData[dataName];
                                        setTooltipContent(`${name}: ${val ? val.toLocaleString() : 'N/A'}`);
                                    }}
                                    onMouseLeave={() => {
                                        setTooltipContent("");
                                    }}
                                    onClick={() => {
                                        if (onStateSelect && dataName) {
                                            onStateSelect(dataName);
                                        }
                                    }}
                                />
                            );
                        })
                    }
                </Geographies>
            </ComposableMap>



            <Tooltip id="map-tooltip" content={tooltipContent} />
        </div >
    );
};

export default IndiaMap;
