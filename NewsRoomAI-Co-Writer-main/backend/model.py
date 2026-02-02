from typing import Optional, List, Dict
from datetime import datetime
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)

    hashed_password: str
    role: str = Field(default="user")

    created_at: datetime = Field(default_factory=datetime.utcnow)

    reset_token: Optional[str] = Field(default=None, index=True)
    reset_token_expiry: Optional[datetime] = None


class Article(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    title: str
    content: str  # original article text

    bias_score: int
    summary: str
    explanation: str

    perspectives: List[str] = Field(
        sa_column=Column(JSON)
    )

    deep_analysis: Optional[Dict] = Field(
        default=None,
        sa_column=Column(JSON)
    )

    rewritten_text: Optional[str] = None  

    author_id: int = 1

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)