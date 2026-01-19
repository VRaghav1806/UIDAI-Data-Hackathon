import pandas as pd
import os
import json
import numpy as np

# Configuration
BASE_DIR = r"e:\adhar hackathon"
DIRS = {
    "biometric": "api_data_aadhar_biometric",
    "demographic": "api_data_aadhar_demographic",
    "enrolment": "api_data_aadhar_enrolment"
}
OUTPUT_FILE = os.path.join(BASE_DIR, "dashboard", "src", "gap_data.json")

def normalize_data(df):
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
            "Pondicherry": "Puducherry",
        }
        if "Dadra" in name or "Daman" in name:
            return "Dadra and Nagar Haveli and Daman and Diu"
        if "Jammu" in name:
            return "Jammu and Kashmir"
        return mapping.get(name, name)

    df['state'] = df['state'].apply(normalize_state)
    df = df[df['state'] != "Unknown"]

    # Normalize District Names
    def normalize_district(row):
        name = str(row['district']).strip().title()
        state = row['state']
        
        mapping = {
            "Gurgaon": "Gurugram",
            "Banglore": "Bengaluru",
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
            "Kochi": "Kochi",
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
            "Ahmedabad": "Ahmedabad",
            "Bulandshahr": "Bulandshahar",
            "Chittoor": "Chittoor",
            "Cuddapah": "YSR Kadapa",
            "Kadapa": "YSR Kadapa",
            "Oudh": "Awadh",
            "Baroda": "Vadodara",
            "Banaras": "Varanasi",
            "Dharabadi": "Dharwad",
            "Guntur": "Guntur",
            "Kurnool": "Kurnool",
            "Nellore": "SPSR Nellore",
            "Vishakhapatnam": "Visakhapatnam",
            "Haidarabad": "Hyderabad",
        }
        
        if state == "Maharashtra" and name == "Aurangabad":
            return "Chhatrapati Sambhajinagar"
        
        return mapping.get(name, name)

    if 'district' in df.columns:
        df['district'] = df.apply(normalize_district, axis=1)

    # Force Correct States
    geographic_reassignment = {
        "Hyderabad": "Telangana",
        "Cyberabad": "Telangana",
        "Rangareddy": "Telangana",
        "Warangal": "Telangana",
        "Khammam": "Telangana",
    }
    
    def reassign_state(row):
        if 'district' in row and row['district'] in geographic_reassignment:
            return geographic_reassignment[row['district']]
        return row['state']
    
    df['state'] = df.apply(reassign_state, axis=1)
    return df

def load_and_aggregate(category):
    dir_path = os.path.join(BASE_DIR, DIRS[category])
    files = [f for f in os.listdir(dir_path) if f.endswith(".csv")]
    dfs = []
    print(f"Loading {category} data...")
    for f in files:
        df = pd.read_csv(os.path.join(dir_path, f))
        dfs.append(df)
    
    full_df = pd.concat(dfs, ignore_index=True)
    full_df = normalize_data(full_df)
    full_df['date'] = pd.to_datetime(full_df['date'], dayfirst=True)
    
    # Identify numeric columns for aggregation
    numeric_cols = [c for c in full_df.columns if 'age' in c]
    
    # Aggregation by Pincode and Month
    full_df['month'] = full_df['date'].dt.to_period('M')
    # Standardize columns for grouping
    group_cols = ['pincode', 'state', 'month']
    if 'district' in full_df.columns:
        group_cols.append('district')
    
    agg_pincode = full_df.groupby(group_cols)[numeric_cols].sum().reset_index()
    agg_pincode['total_' + category] = agg_pincode[numeric_cols].sum(axis=1)
    
    return agg_pincode

def main():
    try:
        # Load all categories
        enrol_agg = load_and_aggregate('enrolment')
        bio_agg = load_and_aggregate('biometric')
        demo_agg = load_and_aggregate('demographic')

        # Merge data on Pincode, State, Month
        merge_on = ['pincode', 'state', 'month']
        # If district exists in all, add it
        if 'district' in enrol_agg.columns and 'district' in bio_agg.columns and 'district' in demo_agg.columns:
            merge_on.append('district')

        merged = pd.merge(enrol_agg, bio_agg[['pincode', 'month', 'total_biometric']], 
                         on=['pincode', 'month'], how='outer')
        merged = pd.merge(merged, demo_agg[['pincode', 'month', 'total_demographic']], 
                         on=['pincode', 'month'], how='outer')

        merged.fillna(0, inplace=True)
        merged['total_demand'] = merged.get('total_enrolment', 0) + merged.get('total_biometric', 0) + merged.get('total_demographic', 0)

        # Aggregate to Pincode level (Total demand across all time)
        group_by = ['pincode', 'state']
        if 'district' in merged.columns:
            group_by.append('district')
            
        pincode_summary = merged.groupby(group_by).agg({
            'total_demand': 'sum'
        }).reset_index()

        # Simulate missing metrics for the model
        print("Simulating supply and access metrics...")
        np.random.seed(42)
        
        # Monthly Growth Rate Calculation (averaging MoM changes)
        merged_sorted = merged.sort_values(['pincode', 'month'])
        merged_sorted['prev_demand'] = merged_sorted.groupby('pincode')['total_demand'].shift(1)
        merged_sorted['growth'] = (merged_sorted['total_demand'] - merged_sorted['prev_demand']) / (merged_sorted['prev_demand'] + 1)
        growth_rates = merged_sorted.groupby('pincode')['growth'].mean().fillna(0).reset_index()
        
        pincode_summary = pd.merge(pincode_summary, growth_rates, on='pincode', how='left')

        # Supply indicators (Simulated based on average demand)
        pincode_summary['supply_capacity'] = pincode_summary['total_demand'] * np.random.uniform(0.6, 1.3, size=len(pincode_summary))
        # Ensure some supply even if demand is 0
        pincode_summary['supply_capacity'] = pincode_summary['supply_capacity'].apply(lambda x: max(x, 10))

        # Population Density (Simulated 0.1 to 1.0)
        pincode_summary['pop_density'] = np.random.uniform(0.1, 1.0, size=len(pincode_summary))
        
        # Access Difficulty (Simulated 0.1 to 1.0)
        pincode_summary['access_difficulty'] = np.random.uniform(0.1, 1.0, size=len(pincode_summary))

        # Calculate Scores
        # Need Score = 0.35 * (Demand/Supply) + 0.25 * PopDensity + 0.20 * GrowthRate + 0.20 * AccessDifficulty
        
        # Normalize metrics to 0-1 for scoring
        def normalize(series):
            if series.max() == series.min(): return series * 0
            return (series - series.min()) / (series.max() - series.min())

        pincode_summary['demand_supply_ratio'] = pincode_summary['total_demand'] / pincode_summary['supply_capacity']
        
        s_ds = normalize(pincode_summary['demand_supply_ratio'])
        s_pd = normalize(pincode_summary['pop_density'])
        s_gr = normalize(pincode_summary['growth'].clip(0, 1)) # Cap growth at 100% for scoring
        s_ad = normalize(pincode_summary['access_difficulty'])

        pincode_summary['need_score'] = (0.35 * s_ds + 
                                       0.25 * s_pd + 
                                       0.20 * s_gr + 
                                       0.20 * s_ad) * 100

        # Round values for display
        pincode_summary['need_score'] = pincode_summary['need_score'].round(1)
        pincode_summary['demand_supply_ratio'] = pincode_summary['demand_supply_ratio'].round(1)
        pincode_summary['growth'] = (pincode_summary['growth'] * 100).round(1)

        # Sort and take top 500 for the dashboard
        top_gaps = pincode_summary.sort_values(by='need_score', ascending=False).head(500)

        # Prepare for JSON
        result = top_gaps.to_dict(orient='records')
        
        # Add a date generated
        from datetime import datetime
        output_data = {
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "top_priority_locations": result
        }

        with open(OUTPUT_FILE, 'w') as f:
            json.dump(output_data, f, indent=4)

        print(f"Gap analysis complete. {len(result)} locations exported to {OUTPUT_FILE}")

    except Exception as e:
        print(f"Error in gap analysis: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
