import pandas as pd
import os

base_dir = r"E:\adhar hackathon"
dirs = ["api_data_aadhar_biometric", "api_data_aadhar_demographic", "api_data_aadhar_enrolment"]

pd.set_option('display.max_columns', None)
pd.set_option('display.width', 1000)

results = []

for d in dirs:
    dir_path = os.path.join(base_dir, d)
    if not os.path.exists(dir_path):
        results.append(f"Directory {dir_path} does not exist.")
        continue
        
    files = [f for f in os.listdir(dir_path) if f.endswith(".csv")]
    if files:
        file_path = os.path.join(dir_path, files[0])
        results.append(f"\n--- {d} ({files[0]}) ---")
        try:
            df = pd.read_csv(file_path, nrows=5)
            results.append(f"Columns: {df.columns.tolist()}")
            results.append(df.head(2).to_string())
            
            # Additional analysis: Check for missing values and data types
            results.append("\nData Types:")
            results.append(str(df.dtypes))
        except Exception as e:
            results.append(f"Error reading {file_path}: {e}")
    else:
        results.append(f"No CSV files found in {dir_path}")

output_text = "\n".join(results)
with open(os.path.join(base_dir, "data_sample_report.txt"), "w") as f:
    f.write(output_text)

print("Sample report generated at e:\\adhar hackathon\\data_sample_report.txt")
