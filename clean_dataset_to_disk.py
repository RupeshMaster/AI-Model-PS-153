import pandas as pd
import numpy as np
import os
import glob
import time

def clean_csv_in_chunks(input_file, output_file, chunk_size=100000):
    """
    Cleans a massive CSV file in chunks so it doesn't crash your computer's RAM.
    """
    first_chunk = True
    
    # Identify the columns to drop
    cols_to_drop = ['Flow ID', 'Src IP', 'Dst IP', 'Timestamp']
    
    # Read in chunks
    for chunk in pd.read_csv(input_file, chunksize=chunk_size, low_memory=False):
        # 1. Clean column names
        chunk.columns = chunk.columns.str.strip()
        
        # 2. Drop specific string/ID columns
        chunk = chunk.drop(columns=[col for col in cols_to_drop if col in chunk.columns], errors='ignore')
        
        # 3. Handle Infinity and NaN
        chunk = chunk.replace([np.inf, -np.inf], np.nan)
        chunk = chunk.dropna()
        
        # 4. Save to new CSV
        # If it's the first chunk, write the header. Otherwise, append without header.
        if first_chunk:
            chunk.to_csv(output_file, index=False, mode='w')
            first_chunk = False
        else:
            chunk.to_csv(output_file, index=False, mode='a', header=False)

def process_all_files():
    input_dir = "c:/AI Model Training/CIC-IDS-2018"
    output_dir = "c:/AI Model Training/Cleaned_Data"
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    csv_files = glob.glob(os.path.join(input_dir, "*.csv"))
    
    print(f"Found {len(csv_files)} files to clean.")
    
    for file in csv_files:
        filename = os.path.basename(file)
        output_path = os.path.join(output_dir, "clean_" + filename)
        
        print(f"\n--- Starting to clean: {filename} ---")
        start_time = time.time()
        
        clean_csv_in_chunks(file, output_path)
        
        print(f"Finished cleaning {filename} in {time.time() - start_time:.2f} seconds.")
        print(f"Cleaned file saved to: {output_path}")

if __name__ == "__main__":
    process_all_files()
