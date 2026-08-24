from pathlib import Path

from dotenv import load_dotenv


# `python run.py` does not load .env automatically. Load it before importing
# the application so Config reads the local OpenAI settings at class creation.
load_dotenv(Path(__file__).resolve().parent / ".env")

from app import create_app


app = create_app()


if __name__ == "__main__":
    app.run(debug=app.config.get("DEBUG", False))
