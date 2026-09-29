from ml_models import train_all


if __name__ == "__main__":
    result = train_all()

    print("\nKrishiMitra rainfall model training complete.")
    print(f"Dataset: {result['dataset']}")
    print(f"Dataset type: {result['dataset_type']}")
    print(f"LSTM: {result['lstm']}")

    if result["dataset_type"] == "demo":
        print(
            "\nWARNING: the demo dataset is synthetic. "
            "Replace it with real historical weather data before "
            "reporting model accuracy."
        )
