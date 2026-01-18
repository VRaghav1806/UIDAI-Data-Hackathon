import React from 'react'
import data from './data.json'
import { TrendingUp, AlertCircle, Lightbulb, MapPin, Users, ShieldCheck, Activity, FileText, Download, Brain, Sparkles, Clock, Calendar } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, Legend
} from 'recharts'
import IndiaMap from './IndiaMap'
import './App.css'
import { translations, stateTranslations, dataTranslations } from './translations'

const App = () => {
    const [selectedState, setSelectedState] = React.useState('All India')
    const [secondaryState, setSecondaryState] = React.useState(null)
    const [isCompareMode, setIsCompareMode] = React.useState(false)
    const [districtSearch, setDistrictSearch] = React.useState('')
    const distributionRef = React.useRef(null)
    const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false)
    const [language, setLanguage] = React.useState('en')
    const { states, global, state_specific } = data

    const t = (key) => {
        if (!key) return ""
        const parts = key.split('.')
        let res = translations[language]
        for (const p of parts) res = res ? res[p] : undefined
        if (res !== undefined) return res
        res = translations['en']
        for (const p of parts) res = res ? res[p] : undefined
        return res !== undefined ? res : key
    }

    const tState = (name) => {
        if (!name) return ""
        return stateTranslations[name]?.[language] || name
    }

    // Helper to translate Data Content (Recommendations, etc.)
    const tData = (text) => {
        if (!text) return "";

        // Exact match with safety check
        const entry = dataTranslations[text];
        if (entry && entry[language]) return entry[language];
        if (entry && entry['en']) return entry['en'];

        // Dynamic Pattern: "Enrolment Drive"
        if (text.includes("Enrolment Drive")) {
            const statePart = text.replace(" Enrolment Drive", "");
            const driveEntry = dataTranslations["Enrolment Drive"];
            const driveTrans = driveEntry ? (driveEntry[language] || driveEntry['en'] || "Enrolment Drive") : "Enrolment Drive";
            return `${tState(statePart)} ${driveTrans}`;
        }

        // Dynamic Pattern: "Focus on peak month"
        const peakBase = "Focus on peak month";
        if (text.startsWith(peakBase)) {
            const peakEntry = dataTranslations[peakBase];
            const peakTrans = peakEntry ? (peakEntry[language] || peakEntry['en'] || peakBase) : peakBase;
            return text.replace(peakBase, peakTrans);
        }

        return text;
    }

    const generatePDF = async () => {
        setIsGeneratingPdf(true)
        const doc = new jsPDF('p', 'mm', 'a4')
        const pageWidth = doc.internal.pageSize.getWidth()

        // Helper to capture and add section
        const addSectionToPdf = async (selector, yOffset = 0) => {
            const element = document.querySelector(selector)
            if (!element) return yOffset

            try {
                const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false })
                const imgData = canvas.toDataURL('image/png')
                const imgProps = doc.getImageProperties(imgData)
                const pdfHeight = (imgProps.height * pageWidth) / imgProps.width

                // Check if new page needed
                if (yOffset + pdfHeight > 280) { // A4 height ~297mm
                    doc.addPage()
                    yOffset = 10
                }

                doc.addImage(imgData, 'PNG', 0, yOffset, pageWidth, pdfHeight)
                return yOffset + pdfHeight + 10 // Return new Y offset
            } catch (error) {
                console.error("Error capturing section:", selector, error)
                return yOffset
            }
        }

        try {
            // Add Header Title Manually
            doc.setFontSize(22)
            doc.setTextColor(40, 40, 40)
            doc.text(`Aadhaar Analytics Report: ${selectedState}`, 10, 20)
            doc.setFontSize(12)
            doc.setTextColor(100)
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 10, 28)

            let currentY = 40

            currentY = await addSectionToPdf('.stats-row', currentY)
            currentY = await addSectionToPdf('.map-section', currentY)
            currentY = await addSectionToPdf('.charts-section', currentY)
            currentY = await addSectionToPdf('.distribution-section', currentY)
            currentY = await addSectionToPdf('.prediction-section', currentY)

            // Side-by-side sections might need separate handling or just capture the container
            // Capturing .side-by-side container
            await addSectionToPdf('.side-by-side', currentY)

            doc.save(`Aadhaar_Report_${selectedState}_${new Date().toISOString().split('T')[0]}.pdf`)
        } catch (err) {
            console.error("PDF Generation failed", err)
            alert("Failed to generate report.")
        } finally {
            setIsGeneratingPdf(false)
        }
    }

    const primaryData = selectedState === 'All India' ? global : state_specific[selectedState]
    const secondaryData = (isCompareMode && secondaryState) ? state_specific[secondaryState] : null

    const {
        growth_patterns,
        trends,
        anomalies: filteredAnomalies = [],
        recommendations: activeRecommendations = [],
        district_breakdown = []
    } = primaryData || {}

    // Prepare Comparison Data for Charts
    const enrolmentData = trends?.enrolment || []
    const bioData = trends?.biometric || []

    const mergedEnrolmentData = React.useMemo(() => {
        if (!secondaryData) return enrolmentData;
        const secTrends = secondaryData.trends.enrolment;
        return enrolmentData.map((d, i) => ({
            ...d,
            sec_age_0_5: secTrends[i]?.age_0_5,
            sec_age_5_17: secTrends[i]?.age_5_17,
            sec_age_18_greater: secTrends[i]?.age_18_greater
        }))
    }, [enrolmentData, secondaryData])

    const mergedBioData = React.useMemo(() => {
        if (!secondaryData) return bioData;
        const secTrends = secondaryData.trends.biometric;
        return bioData.map((d, i) => ({
            ...d,
            sec_bio_age_5_17: secTrends[i]?.bio_age_5_17,
            sec_bio_age_17_: secTrends[i]?.bio_age_17_
        }))
    }, [bioData, secondaryData])

    // Generate State-Specific Metrics and Forecast
    const stateMetrics = React.useMemo(() => {
        const stateData = selectedState === 'All India' ? global : state_specific[selectedState];
        if (!stateData) return { peakMonth: "June", spikePercentage: 25, mandatoryRatio: 40, hotspot: "Hotspot", avgEnrolment: 50000 };

        const gp = stateData.growth_patterns;
        const enrolmentTrends = stateData.trends?.enrolment || [];
        const bioTrends = stateData.trends?.biometric || [];

        const validEnrolment = enrolmentTrends.filter(e => e.age_0_5 !== undefined);
        const avgEnrolment = validEnrolment.length > 0
            ? validEnrolment.reduce((acc, curr) => acc + (curr.age_0_5 || 0) + (curr.age_5_17 || 0), 0) / validEnrolment.length
            : 50000;

        const spikePercentage = gp?.peak_enrolment?.value
            ? Math.round(((gp.peak_enrolment.value - avgEnrolment) / avgEnrolment) * 100)
            : 25;

        const latestBio = bioTrends.length > 0 ? bioTrends[bioTrends.length - 1] : { bio_age_5_17: 40, bio_age_17_: 60 };
        const mandatoryRatio = Math.round(((latestBio.bio_age_5_17 || 40) / ((latestBio.bio_age_5_17 || 40) + (latestBio.bio_age_17_ || 60))) * 100);

        const monthNames = {
            "01": "January", "02": "February", "03": "March", "04": "April",
            "05": "May", "06": "June", "07": "July", "08": "August",
            "09": "September", "10": "October", "11": "November", "12": "December"
        };
        const peakMonthCode = gp?.peak_enrolment?.month?.split('-')[1] || "06";
        const peakMonth = monthNames[peakMonthCode] || "June";

        const topDist = stateData.top_districts?.[0]?.district || (selectedState === 'All India' ? "National Centers" : "Urban Hubs");

        return {
            peakMonth,
            spikePercentage: spikePercentage > 0 ? spikePercentage : 25,
            mandatoryRatio: mandatoryRatio > 0 ? mandatoryRatio : 40,
            hotspot: topDist,
            avgEnrolment
        };
    }, [selectedState, global, state_specific])

    const forecastData = React.useMemo(() => {
        const stateData = selectedState === 'All India' ? global : state_specific[selectedState];
        if (!stateData) return [];
        const enrolmentTrends = stateData.trends?.enrolment || [];

        // Predict May - August 2026 based on 2025 baseline
        const forecastMonths = ["05", "06", "07", "08"];
        const growthFactor = 1.12;

        return forecastMonths.map(mCode => {
            const historical = enrolmentTrends.find(t => t.name.endsWith(`-${mCode}`));
            const baseValue = historical ? (historical.age_0_5 + historical.age_5_17) : stateMetrics.avgEnrolment;
            return {
                name: `2026-${mCode}`,
                predicted: Math.round(baseValue * growthFactor)
            };
        });
    }, [selectedState, stateMetrics])


    const searchedDistricts = district_breakdown.filter(d =>
        d.district.toLowerCase().includes(districtSearch.toLowerCase())
    )

    const handleStateSelect = (stateName) => {
        if (isCompareMode) {
            if (stateName !== selectedState) {
                setSecondaryState(stateName === secondaryState ? null : stateName)
            }
        } else {
            if (stateName !== selectedState) {
                setSelectedState(stateName)
                setSecondaryState(null)
            }
        }
    }

    return (
        <div className={`dashboard-container lang-${language}`}>
            <header className="header glass">
                <div className="logo-section">
                    <div className="logo">
                        <ShieldCheck className="logo-icon" size={32} />
                        <span>{t('appTitle')}</span>
                    </div>
                    <div className="header-badge">{t('liveAnalysis')}</div>
                </div>

                <div className="header-content">
                    <h1 className="gradient-text">{t('mainHeading')}</h1>
                    <p className="subtitle">{t('subHeadingPrefix')} {selectedState === 'All India' ? `National ${t('governance')}` : secondaryState ? `${t('comparePrefix')} ${tState(selectedState)} ${t('vs')} ${tState(secondaryState)}` : `${tState(selectedState)} ${t('governance')}`}</p>
                </div>

                <div className="header-controls">
                    <select
                        className="lang-selector glass"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                    >
                        <option value="en">English</option>
                        <option value="hi">हिंदी</option>
                        <option value="ta">தமிழ்</option>
                        <option value="te">తెలుగు</option>
                    </select>
                    <button
                        className="btn-glass"
                        onClick={generatePDF}
                        disabled={isGeneratingPdf}
                        title="Download PDF Report"
                    >
                        {isGeneratingPdf ? <Activity className="spin" size={18} /> : <FileText size={18} />}
                        <span>{isGeneratingPdf ? t('generating') : t('report')}</span>
                    </button>

                    <div className="compare-toggle-wrapper glass">
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={isCompareMode}
                                onChange={(e) => {
                                    setIsCompareMode(e.target.checked)
                                    if (!e.target.checked) setSecondaryState(null)
                                }}
                            />
                            <span className="slider round"></span>
                        </label>
                        <span className="toggle-label">{t('compareMode')}</span>
                    </div>

                    <div className="state-selector-wrapper">
                        <select
                            className="state-selector glass"
                            value={selectedState}
                            onChange={(e) => handleStateSelect(e.target.value)}
                        >
                            {states.map(state => (
                                <option key={state} value={state}>{tState(state)}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            <main className="main-grid">
                {/* Stats Row */}
                <section className="stats-row">
                    <div className="stat-card glass">
                        <div className="stat-icon-wrapper enrol">
                            <Users size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">{t('peakEnrolment')}</span>
                            <span className="stat-value">
                                {growth_patterns.peak_enrolment.value.toLocaleString()}
                                {secondaryData && <span className="stat-compare">{t('vs')} {secondaryData.growth_patterns.peak_enrolment.value.toLocaleString()}</span>}
                            </span>
                            <span className="stat-meta">In {growth_patterns.peak_enrolment.month}</span>
                        </div>
                    </div>
                    <div className="stat-card glass">
                        <div className="stat-icon-wrapper bio">
                            <TrendingUp size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">{t('updateArea')}</span>
                            <span className="stat-value">
                                {growth_patterns.peak_bio_category ? growth_patterns.peak_bio_category.replace('bio_age_', '').replace(/_$/, '+').replace('_', '-') : 'Adults'}
                                {secondaryData && <span className="stat-compare">{t('vs')} {secondaryData.growth_patterns.peak_bio_category?.replace('bio_age_', '').replace(/_$/, '+').replace('_', '-') || 'N/A'}</span>}
                            </span>
                            <span className="stat-meta">{t('highPriority')}</span>
                        </div>
                    </div>
                    <div className="stat-card glass">
                        <div className="stat-icon-wrapper demo">
                            <TrendingUp size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">{t('demographicFlow')}</span>
                            <span className="stat-value">
                                {growth_patterns.peak_demo_category ? growth_patterns.peak_demo_category.replace('demo_age_', '').replace(/_$/, '+').replace('_', '-') : 'Mobile'}
                                {secondaryData && <span className="stat-compare">{t('vs')} {secondaryData.growth_patterns.peak_demo_category?.replace('demo_age_', '').replace(/_$/, '+').replace('_', '-') || 'N/A'}</span>}
                            </span>
                            <span className="stat-meta">{t('mobilePopulations')}</span>
                        </div>
                    </div>
                </section>


                {/* Predictive Demand intelligence Section */}
                <section className="prediction-section glass">
                    <div className="section-header">
                        <h2 className="section-title"><Brain size={24} color="#facc15" /> {t('predictiveForecast')} <span className="beta-badge">AI</span></h2>
                        <p className="section-subtitle">{t('forecastDescription')}</p>
                    </div>

                    <div className="prediction-grid">
                        <div className="chart-card glass prediction-chart-card">
                            <h3>{t('predictedTraffic')}</h3>
                            <div className="chart-wrapper">
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={forecastData}>
                                        <defs>
                                            <linearGradient id="colorPredict" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#facc15" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickMargin={10} />
                                        <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `${value / 1000}k`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                                        />
                                        <Area type="monotone" dataKey="predicted" name={t('predictedTraffic')} stroke="#facc15" strokeWidth={3} fillOpacity={1} fill="url(#colorPredict)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="prediction-insights">
                            <h3 className="flex items-center gap-2"><Sparkles size={18} /> {t('demandInsights')}</h3>

                            <div className="insight-card glass">
                                <h4><Calendar className="insight-icon" size={18} /> {t('schoolAdmissionSpike')}</h4>
                                <p>
                                    {t('schoolSpikeDesc')
                                        .replace('{location}', selectedState === 'All India' ? t('national') : tState(selectedState))
                                        .replace('{month}', t(`months.${stateMetrics.peakMonth}`))
                                        .replace('{percent}', stateMetrics.spikePercentage)}
                                </p>
                            </div>

                            <div className="insight-card glass">
                                <h4><Clock className="insight-icon" size={18} /> {t('mandatoryUpdateCycle')}</h4>
                                <p>
                                    {t('mandatoryUpdateDesc')
                                        .replace('{location}', tState(selectedState))
                                        .replace('{ratio}', stateMetrics.mandatoryRatio)
                                        .replace('{increase}', 15)}
                                </p>
                            </div>

                            <div className="insight-card glass">
                                <h4><TrendingUp className="insight-icon" size={18} /> {t('optimalResource')}</h4>
                                <p>
                                    {t('resourceAllocationDesc')
                                        .replace('{vans}', 12)
                                        .replace('{hotspot}', stateMetrics.hotspot)}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Geographical Intelligence Section (Map) */}
                <section className="map-section glass">
                    <div className="section-header">
                        <h2 className="section-title"><Activity size={20} color="#6366f1" /> {t('geoDensity')}</h2>
                    </div>
                    <div className="map-wrapper">
                        {/* Pass state_specific data to map, and handle selection */}
                        <IndiaMap
                            stateData={state_specific}
                            activeState={selectedState}
                            secondaryState={secondaryState}
                            onStateSelect={handleStateSelect}
                        />
                        <div className="map-legend">
                            <span>{t('lowDensity')}</span>
                            <div className="age-gradient-bar"></div>
                            <span>{t('highDensity')}</span>
                        </div>
                    </div>
                </section>

                {/* Interactive Charts Section */}
                <section className="charts-section">
                    <h2 className="section-title"><TrendingUp size={20} /> {secondaryState ? `${tState(selectedState)} ${t('vs')} ${tState(secondaryState)} ${t('trendAnalytics')}` : `${tState(selectedState)} ${t('trendAnalytics')}`}</h2>
                    <div className="charts-grid-interactive">
                        <div className="chart-card glass">
                            <h3>{t('enrolmentVol')}</h3>
                            {trends.enrolment.length > 0 ? (
                                <div className="chart-wrapper">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={mergedEnrolmentData}>
                                            <defs>
                                                <linearGradient id="colorEnrol" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#facc15" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickMargin={10} />
                                            <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `${value / 1000}k`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                                itemStyle={{ color: '#1e293b' }}
                                                labelStyle={{ color: '#64748b' }}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="circle" />

                                            {/* Primary State Series */}
                                            <Area type="monotone" dataKey="age_0_5" name={`${tState(selectedState)} (0-5)`} stroke="#facc15" strokeWidth={2} fillOpacity={1} fill="url(#colorEnrol)" />
                                            <Area type="monotone" dataKey="age_5_17" name={`${tState(selectedState)} (5-17)`} stroke="#1e293b" strokeWidth={2} fillOpacity={0.1} fill="#1e293b" />

                                            {/* Secondary State Series (Comparison) */}
                                            {secondaryState && (
                                                <>
                                                    <Area type="monotone" dataKey="sec_age_0_5" name={`${tState(secondaryState)} (0-5)`} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" fillOpacity={0} />
                                                    <Area type="monotone" dataKey="sec_age_5_17" name={`${tState(secondaryState)} (5-17)`} stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" fillOpacity={0} />
                                                </>
                                            )}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="no-data">Insufficient data for {selectedState}</div>
                            )}
                        </div>

                        <div className="chart-card glass">
                            <h3>{t('updateFreq')}</h3>
                            {trends.biometric.length > 0 ? (
                                <div className="chart-wrapper">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={mergedBioData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickMargin={10} />
                                            <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `${value / 1000}k`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                                itemStyle={{ color: '#1e293b' }}
                                                labelStyle={{ color: '#64748b' }}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="circle" />

                                            {/* Primary State Series */}
                                            <Line type="monotone" dataKey="bio_age_5_17" name={`${tState(selectedState)} (5-17)`} stroke="#facc15" strokeWidth={3} dot={{ r: 4, fill: '#facc15' }} activeDot={{ r: 8 }} />
                                            <Line type="monotone" dataKey="bio_age_17_" name={`${tState(selectedState)} (17+)`} stroke="#1e293b" strokeWidth={3} dot={{ r: 4, fill: '#1e293b' }} activeDot={{ r: 8 }} />

                                            {/* Secondary State Series (Comparison) */}
                                            {secondaryState && (
                                                <>
                                                    <Line type="monotone" dataKey="sec_bio_age_5_17" name={`${tState(secondaryState)} (5-17)`} stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 3, fill: '#3b82f6' }} />
                                                    <Line type="monotone" dataKey="sec_bio_age_17_" name={`${tState(secondaryState)} (17+)`} stroke="#06b6d4" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 3, fill: '#06b6d4' }} />
                                                </>
                                            )}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="no-data">Insufficient data for {selectedState}</div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Regional Distribution Section */}
                <section className="distribution-section glass" ref={distributionRef}>
                    <div className="section-header">
                        <h2 className="section-title"><MapPin size={20} color="#38bdf8" /> {selectedState === 'All India' ? t('topDistricts') : `${tState(selectedState)} ${t('regionalDist')}`}</h2>
                        <div className="dist-search-input">
                            <input
                                type="text"
                                placeholder={t('searchPlaceholder')}
                                className="glass"
                                value={districtSearch}
                                onChange={(e) => setDistrictSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="dist-grid">
                        {searchedDistricts.length > 0 ? searchedDistricts.map((item, idx) => (
                            <div key={idx} className="dist-item">
                                <span className="dist-name">{item.district}</span>
                                <div className="dist-bar-wrapper">
                                    <div
                                        className="dist-bar"
                                        style={{ width: `${(item.total / district_breakdown[0].total) * 100}%` }}
                                    ></div>
                                    <span className="dist-count">{item.total.toLocaleString()}</span>
                                </div>
                                {selectedState === 'All India' && <span className="dist-state-label">{tState(item.state)}</span>}
                            </div>
                        )) : (
                            <div className="no-data">No districts matching "{districtSearch}"</div>
                        )}
                    </div>
                </section>

                <div className="side-by-side">
                    {/* Anomalies Section */}
                    <section className="anomalies-section glass">
                        <h2 className="section-title"><AlertCircle size={20} color="#f43f5e" /> {selectedState === 'All India' ? `National ${t('anomalies')}` : `${tState(selectedState)} ${t('hotspots')}`}</h2>
                        <div className="anomaly-list">
                            {filteredAnomalies.length > 0 ? filteredAnomalies.map((item, idx) => (
                                <div key={idx} className="anomaly-item">
                                    <div className="anomaly-loc">
                                        <MapPin size={14} />
                                        <strong>{item.district}</strong>, {tState(item.state)}
                                    </div>
                                    <div className="anomaly-value">{item.total.toLocaleString()} <small>enrolments</small></div>
                                </div>
                            )) : (
                                <div className="no-anomalies">No significant anomalies in this region.</div>
                            )}
                        </div>
                        <p className="note"> Districts with Z-score &gt; 3 flagged for priority audit.</p>
                    </section>

                    {/* Solutions Section */}
                    <section className="solutions-section">
                        <h2 className="section-title"><Lightbulb size={20} color="#fbbf24" /> {t('solutions')}</h2>
                        <div className="recommendations-grid">
                            {activeRecommendations.map((rec, idx) => (
                                <div key={idx} className="rec-card glass">
                                    <h4>{tData(rec.title)}</h4>
                                    <p>{tData(rec.description)}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>

            <footer className="footer">
                <p>{t('footer').replace('{state}', tState(selectedState))}</p>
            </footer>
        </div >
    )
}

export default App
