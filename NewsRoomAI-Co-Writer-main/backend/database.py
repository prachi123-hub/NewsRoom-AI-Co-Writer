import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in .env file")

engine = create_engine(
    DATABASE_URL,
    echo=True  # keep ON while learning
)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
