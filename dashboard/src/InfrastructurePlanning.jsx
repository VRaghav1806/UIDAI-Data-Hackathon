import React from 'react';
import { MapPin, Activity, ChevronRight } from 'lucide-react';
import gapData from './gap_data.json';

const InfrastructurePlanning = ({ selectedState, translations, tState, tData }) => {
    // Process gap analysis data
    const allLocations = gapData.top_priority_locations || [];

    // Filter by selected state (case-insensitive and trimmed for robustness)
    const filteredLocations = selectedState === 'All India'
        ? allLocations
        : allLocations.filter(loc => {
            if (!loc.state) return false;
            return String(loc.state).trim() === String(selectedState).trim();
        });

    // Display all filtered locations for state level, but limit for All India to keep it readable
    const pinData = selectedState === 'All India' ? filteredLocations.slice(0, 20) : filteredLocations;

    return (
        <div className="infrastructure-planning-container">
            <div className="infrastructure-header-stats">
                <div className="stat-card glass model-focus">
                    <div className="stat-icon-wrapper loc">
                        <MapPin size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">{translations.infraModelFocus}</span>
                        <h3 className="stat-title">{tState(selectedState)}</h3>
                        <span className="stat-meta">{translations.infraPinLevel}</span>
                    </div>
                </div>
                <div className="stat-card glass gaps-found">
                    <div className="stat-icon-wrapper pulse">
                        <Activity size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">{translations.infraCriticalGaps}</span>
                        <h3 className="stat-title">{pinData.length}</h3>
                        <span className="stat-meta">{translations.infraZonesReq}</span>
                    </div>
                </div>
            </div>

            <section className="expansion-section glass">
                <div className="section-header">
                    <div className="title-group">
                        <Activity className="section-icon" size={24} />
                        <div>
                            <h2 className="section-title">{translations.infraExpansionTitle}</h2>
                            <p className="section-subtitle">{translations.infraExpansionSub}</p>
                        </div>
                    </div>
                </div>

                <div className="priority-table-header">
                    <span>{translations.infraPinCode}</span>
                    <span>{translations.infraDistState}</span>
                    <span>{translations.infraNeedScore}</span>
                    <span>{translations.infraMetricsBreakdown}</span>
                    <span>{translations.infraRecommendation}</span>
                </div>

                <div className="priority-list">
                    {pinData.length > 0 ? pinData.map((pin, idx) => (
                        <div key={`${pin.pincode}-${idx}`} className="priority-item-card glass">
                            <span className="pin-code">{pin.pincode}</span>
                            <div className="district-info">
                                <strong>{pin.district && pin.district !== 0 ? pin.district : translations.infraIndustrialCluster}</strong>
                                <span className="state-label">{pin.state && pin.state !== 0 ? tState(pin.state) : tState(selectedState)}</span>
                            </div>
                            <div className="score-badge">
                                {pin.need_score}
                            </div>
                            <div className="metrics-group">
                                <div className="metric-row">
                                    <span className="metric-label">{translations.infraGapDS}</span>
                                    <div className="metric-bar-container">
                                        <div className="metric-bar demand" style={{ width: `${Math.min((pin.demand_supply_ratio / 2) * 100, 100)}%` }}></div>
                                    </div>
                                    <span className="metric-value">{pin.demand_supply_ratio}x</span>
                                </div>
                                <div className="metric-row">
                                    <span className="metric-label">{translations.infraGrowth}</span>
                                    <div className="metric-bar-container">
                                        <div className="metric-bar growth" style={{ width: `${Math.min(pin.growth, 100)}%` }}></div>
                                    </div>
                                    <span className="metric-value">{pin.growth}%</span>
                                </div>
                            </div>
                            <button className="recommendation-link">
                                {translations.infraEstablishCenter} <ChevronRight size={16} />
                            </button>
                        </div>
                    )) : (
                        <div className="no-data" style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
                            {translations.infraNoData.replace('{state}', tState(selectedState))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default InfrastructurePlanning;
