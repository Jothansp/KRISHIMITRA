
from pathlib import Path
from ml_models import train_all

if __name__ == "__main__":
    result = train_all()
    print("\nKrishiMitra model training complete.")
    print(f"Dataset: {result['dataset']}")
    print(f"Dataset type: {result['dataset_type']}")
    print(f"Random Forest: {result['random_forest']}")
    print(f"LSTM: {result['lstm']}")
    if result["dataset_type"] == "demo":
        print("\nWARNING: the demo dataset is synthetic. Replace it with real historical")
        print("rainfall + environmental + flood records before reporting model accuracy.")
