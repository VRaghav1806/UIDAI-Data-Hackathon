import pandas as pd
import os
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

# Configuration
BASE_DIR = r"E:\adhar hackathon"
DIRS = {
    "biometric": "api_data_aadhar_biometric",
    "demographic": "api_data_aadhar_demographic",
    "enrolment": "api_data_aadhar_enrolment"
}
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def load_data(category):
    dir_path = os.path.join(BASE_DIR, DIRS[category])
    files = [f for f in os.listdir(dir_path) if f.endswith(".csv")]
    dfs = []
    for f in files:
        df = pd.read_csv(os.path.join(dir_path, f))
        dfs.append(df)
    full_df = pd.concat(dfs, ignore_index=True)
    full_df['date'] = pd.to_datetime(full_df['date'], dayfirst=True)
    
    # Normalize State Names
    def normalize_state(name):
        if not isinstance(name, str) or name.isdigit(): return "Unknown"
        name = name.strip().title()
        name = name.replace(" & ", " And ")
        mapping = {
            "Andaman And Nicobar Islands": "Andaman And Nicobar Islands",
            "Andaman & Nicobar Islands": "Andaman And Nicobar Islands",
            "Orissa": "Odisha",
            "West Bangal": "West Bengal",
            "Westbengal": "West Bengal",
            "West  Bengal": "West Bengal",
            "West Bengal": "West Bengal",
            "Westbengal": "West Bengal",
            "Pondicherry": "Puducherry",
        }
        if "Dadra" in name or "Daman" in name:
            return "Dadra and Nagar Haveli and Daman and Diu"
        if "Jammu" in name:
            return "Jammu and Kashmir"
        return mapping.get(name, name)

    full_df['state'] = full_df['state'].apply(normalize_state)
    full_df = full_df[full_df['state'] != "Unknown"]

    # Normalize District Names
    def normalize_district(row):
        name = str(row['district']).strip().title()
        state = row['state']
        
        # General spelling fixes
        mapping = {
            "Gurgaon": "Gurugram",
            "Bangalore": "Bengaluru",
            "Bangalore Rural": "Bengaluru Rural",
            "Bangalore Urban": "Bengaluru Urban",
            "Mysore": "Mysuru",
            "Belgaum": "Belagavi",
            "Faizabad": "Ayodhya",
            "Allahabad": "Prayagraj",
            "Osmanabad": "Dharashiv",
            "Shimoga": "Shivamogga",
            "Mangalore": "Mangaluru",
            "Bellary": "Ballari",
            "Gulbarga": "Kalaburagi",
            "Bijapur": "Vijayapura",
            "Chikmagalur": "Chikkamagaluru",
            "Tumkur": "Tumakuru",
            "Hospet": "Hosapete",
            "Hubli": "Hubballi",
            "Dharwad": "Dharwad",
            "Alappuzha": "Alleppey",
            "Palakkad": "Palghat",
            "Thrissur": "Trichur",
            "Kozhikode": "Calicut",
            "Kollam": "Quilon",
            "Panjim": "Panaji",
            "Cochin": "Kochi",
            "Trivandrum": "Thiruvananthapuram",
            "Gauhati": "Guwahati",
            "Benares": "Varanasi",
            "Cawnpore": "Kanpur",
            "Pondicherry": "Puducherry",
            "Buldana": "Buldhana",
            "Beed": "Bid",
            "Firozabad": "Firozabad",
            "Mughalsarai": "Pt. Deen Dayal Upadhyaya Nagar",
            "Tirunelveli": "Nellai",
            "Vizag": "Visakhapatnam",
            "Waltair": "Visakhapatnam",
            "Madras": "Chennai",
            "Bombay": "Mumbai",
            "Calcutta": "Kolkata",
            "Poona": "Pune",
            "Ahmadabad": "Ahmedabad",
            "Bulandshahr": "Bulandshahar",
            "Chittoor": "Chittoor", # Self-mapping for safety
            "Cuddapah": "YSR Kadapa",
            "Kadapa": "YSR Kadapa",
            "Belgaum": "Belagavi",
            "Gulbarga": "Kalaburagi",
            "Shimoga": "Shivamogga",
            "Bijapur": "Vijayapura",
            "Hubli": "Hubballi",
            "Mysore": "Mysuru",
            "Oudh": "Awadh",
        }
        
        # State-specific rename logic
        if state == "Maharashtra" and name == "Aurangabad":
            return "Chhatrapati Sambhajinagar"
        
        # Geographical Corrections (Correcting historical data/errors)
        if name == "Hyderabad":
            return "Hyderabad" # State will be forced below
        
        return mapping.get(name, name)

    full_df['district'] = full_df.apply(normalize_district, axis=1)

    # Force Correct States for specific Districts
    geographic_reassignment = {
        "Hyderabad": "Telangana",
        "Cyberabad": "Telangana",
        "Rangareddy": "Telangana",
        "Warangal": "Telangana",
        "Khammam": "Telangana",
    }
    
    def reassign_state(row):
        if row['district'] in geographic_reassignment:
            return geographic_reassignment[row['district']]
        return row['state']
    
    full_df['state'] = full_df.apply(reassign_state, axis=1)
    
    return full_df

def analyze_trends(df, category):
    print(f"\n--- Analyzing Trends for {category} ---")
    
    # Monthly Aggregation
    df['month'] = df['date'].dt.to_period('M')
    monthly_stats = df.groupby('month').sum(numeric_only=True)
    
    # Plotting Total Volume over time
    plt.figure(figsize=(12, 6))
    if category == 'enrolment':
        cols = ['age_0_5', 'age_5_17', 'age_18_greater']
        monthly_stats[cols].plot(kind='line', marker='o')
        plt.title(f'Aadhaar Enrolment Trends by Age Group')
    else:
        prefix = 'bio_' if category == 'biometric' else 'demo_'
        cols = [f'{prefix}age_5_17', f'{prefix}age_17_']
        monthly_stats[cols].plot(kind='line', marker='o')
        plt.title(f'Aadhaar {category.capitalize()} Updates by Age Group')
    
    plt.ylabel('Count')
    plt.grid(True)
    plt.savefig(os.path.join(OUTPUT_DIR, f"{category}_trends.png"))
    plt.close()
    
    return monthly_stats

def detect_anomalies(df, category):
    print(f"--- Detecting Anomalies for {category} ---")
    # Identify high-volume districts (Outliers using Z-score logic)
    agg_cols = [c for c in df.columns if 'age' in c]
    district_stats = df.groupby(['state', 'district'])[agg_cols].sum().reset_index()
    district_stats['total'] = district_stats[agg_cols].sum(axis=1)
    
    mean = district_stats['total'].mean()
    std = district_stats['total'].std()
    threshold = mean + 3 * std
    
    anomalies = district_stats[district_stats['total'] > threshold]
    return anomalies

def main():
    try:
        # 1. Load Data
        enrol_df = load_data('enrolment')
        bio_df = load_data('biometric')
        demo_df = load_data('demographic')
        
        # 2. Analyze Trends
        enrol_monthly = analyze_trends(enrol_df, 'enrolment')
        bio_monthly = analyze_trends(bio_df, 'biometric')
        demo_monthly = analyze_trends(demo_df, 'demographic')
        
        # Helper to convert monthly stats to list of dicts for Recharts
        def prepare_trend(stats_df):
            stats_df = stats_df.copy()
            stats_df['name'] = stats_df.index.astype(str)
            return stats_df.to_dict(orient='records')

        # 3. State-wise Aggregation
        print("--- Aggregating State-wise Data ---")
        states = sorted(enrol_df['state'].unique().tolist())
        
        # Pre-detect all anomalies to filter them easily
        all_enrol_anomalies = detect_anomalies(enrol_df, 'enrolment')
        all_bio_anomalies = detect_anomalies(bio_df, 'biometric')

        def get_state_metrics(state_name):
            s_enrol = enrol_df[enrol_df['state'] == state_name]
            s_bio = bio_df[bio_df['state'] == state_name]
            s_demo = demo_df[demo_df['state'] == state_name]
            
            s_enrol_m = s_enrol.groupby(s_enrol['date'].dt.to_period('M')).sum(numeric_only=True)
            s_bio_m = s_bio.groupby(s_bio['date'].dt.to_period('M')).sum(numeric_only=True)
            s_demo_m = s_demo.groupby(s_demo['date'].dt.to_period('M')).sum(numeric_only=True)
            
            s_enrol_total = s_enrol_m[['age_0_5', 'age_5_17', 'age_18_greater']].sum(axis=1) if not s_enrol_m.empty else pd.Series()
            
            # Categories for insights
            peak_bio_col = s_bio_m[[c for c in s_bio_m.columns if 'bio_age' in c]].sum(axis=0).idxmax() if not s_bio_m.empty else "N/A"
            peak_demo_col = s_demo_m[[c for c in s_demo_m.columns if 'demo_age' in c]].sum(axis=0).idxmax() if not s_demo_m.empty else "N/A"

            # Dynamic Recommendations
            recs = [
                {
                    "title": f"{state_name} Enrolment Drive",
                    "description": f"Focus on peak month {s_enrol_total.idxmax() if not s_enrol_total.empty else 'Cycles'} for school-linked camps."
                },
                {
                    "title": "Update Optimization",
                    "description": f"Streamline {peak_demo_col.replace('demo_age_', '').replace('_', '+')} demographic updates via mobile vans."
                },
                {
                    "title": "Biometric Compliance",
                    "description": f"Target {peak_bio_col.replace('bio_age_', '').replace('_', '+')} age group for mandatory biometric renewals."
                }
            ]

            # District-wise Breakdown
            agg_cols = [c for c in s_enrol.columns if 'age' in c]
            dist_stats = s_enrol.groupby('district')[agg_cols].sum().reset_index()
            dist_stats['total'] = dist_stats[agg_cols].sum(axis=1)
            dist_stats = dist_stats.sort_values(by='total', ascending=False)
            district_breakdown = dist_stats[['district', 'total']].to_dict(orient='records')

            return {
                "growth_patterns": {
                    "peak_enrolment": {
                        "month": str(s_enrol_total.idxmax()) if not s_enrol_total.empty else "N/A",
                        "value": int(s_enrol_total.max()) if not s_enrol_total.empty else 0
                    },
                    "peak_bio_category": peak_bio_col,
                    "peak_demo_category": peak_demo_col
                },
                "trends": {
                    "enrolment": prepare_trend(s_enrol_m[['age_0_5', 'age_5_17', 'age_18_greater']]) if not s_enrol_m.empty else [],
                    "biometric": prepare_trend(s_bio_m[[c for c in s_bio_m.columns if 'bio_age' in c]]) if not s_bio_m.empty else [],
                    "demographic": prepare_trend(s_demo_m[[c for c in s_demo_m.columns if 'demo_age' in c]]) if not s_demo_m.empty else []
                },
                "anomalies": all_enrol_anomalies[all_enrol_anomalies['state'] == state_name].head(10).to_dict(orient='records'),
                "recommendations": recs,
                "district_breakdown": district_breakdown
            }

        state_data = {state: get_state_metrics(state) for state in states}

        # Global District Breakdown (Top 20)
        agg_cols_all = [c for c in enrol_df.columns if 'age' in c]
        global_dist_stats = enrol_df.groupby(['district', 'state'])[agg_cols_all].sum().reset_index()
        global_dist_stats['total'] = global_dist_stats[agg_cols_all].sum(axis=1)
        global_dist_stats = global_dist_stats.sort_values(by='total', ascending=False).head(20)
        global_dist_breakdown = global_dist_stats[['district', 'state', 'total']].to_dict(orient='records')

        # 4. Global Recommendations (Fallback/Default)
        global_recs = [
            {
                "title": "National Predictive Camps",
                "description": "Deploy permanent centers in high-growth clusters identified via nationwide Z-score analysis."
            },
            {
                "title": "Digital Self-Service Update",
                "description": "Incentivize AI-driven document verification for demographic updates to reduce center footfall."
            },
            {
                "title": "Mandatory Renewal Tracker",
                "description": "Implement appointment-based notifications for the 5-17 and 17+ biometric renewal cycles."
            }
        ]

        # 5. Export JSON for Dashboard
        bio_total_cols = [c for c in bio_monthly.columns if 'bio_age' in c]
        demo_total_cols = [c for c in demo_monthly.columns if 'demo_age' in c]
        enrol_total_monthly = enrol_monthly[['age_0_5', 'age_5_17', 'age_18_greater']].sum(axis=1)

        dashboard_data = {
            "states": ["All India"] + states,
            "global": {
                "growth_patterns": {
                    "peak_enrolment": {
                        "month": str(enrol_total_monthly.idxmax()),
                        "value": int(enrol_total_monthly.max())
                    },
                    "peak_bio_category": bio_monthly[bio_total_cols].sum(axis=0).idxmax(),
                    "peak_demo_category": demo_monthly[demo_total_cols].sum(axis=0).idxmax()
                },
                "trends": {
                    "enrolment": prepare_trend(enrol_monthly[['age_0_5', 'age_5_17', 'age_18_greater']]),
                    "biometric": prepare_trend(bio_monthly[bio_total_cols]),
                    "demographic": prepare_trend(demo_monthly[demo_total_cols])
                },
                "anomalies": all_enrol_anomalies.head(10).to_dict(orient='records'),
                "recommendations": global_recs,
                "district_breakdown": global_dist_breakdown
            },
            "state_specific": state_data
        }
        
        import json
        with open(os.path.join(BASE_DIR, "dashboard", "src", "data.json"), "w") as f:
            json.dump(dashboard_data, f, indent=4)
            
        print(f"JSON data exported to {os.path.join(BASE_DIR, 'dashboard_data.json')}")
        print(f"Analysis complete. Report generated at {os.path.join(BASE_DIR, 'aadhaar_insights_report.md')}")
        print(f"Visualizations saved to {OUTPUT_DIR}")

    except Exception as e:
        print(f"Error during analysis: {e}")

if __name__ == "__main__":
    main()
