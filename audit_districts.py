import json
import os

# Base directory setup
BASE_DIR = r"e:\adhar hackathon"
DATA_FILE = os.path.join(BASE_DIR, "dashboard", "src", "data.json")

def audit_districts():
    try:
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
            
        print("\n--- District Audit Log ---\n")
        
        state_specific = data.get("state_specific", {})
        
        for state, metrics in sorted(state_specific.items()):
            print(f"State: {state}")
            districts = [d['district'] for d in metrics.get('district_breakdown', [])]
            districts.sort()
            
            # Print districts in a clean format
            # print(f"  Total Districts: {len(districts)}")
            # print(f"  Districts: {', '.join(districts)}")
            
            # Simple heuristic for potential duplicates: Levenshtein distance or just soundex? 
            # For now, just printing them sorted allows visual inspection of near-duplicates (e.g. "Ahmedabad", "Ahmadabad")
            for d in districts:
                print(f"    - {d}")
            print("-" * 30)
            
    except Exception as e:
        print(f"Error reading data.json: {e}")

if __name__ == "__main__":
    audit_districts()
