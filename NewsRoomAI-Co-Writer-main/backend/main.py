from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from sqlmodel import Session, select
from database import engine, create_db_and_tables
from model import Article
from ai import analyze_text, fetch_article_from_link
from rewrite_ai import rewrite_article_neutral   
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse
from io import BytesIO
from reportlab.pdfgen import canvas
from auth_routes import router as auth_router
from database import create_db_and_tables


load_dotenv()

app = FastAPI()
app.include_router(auth_router)



@app.on_event("startup")
def on_startup():
    create_db_and_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5176",
        "http://localhost:3000",
        "http://localhost:3001", 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# REQUEST MODELS
# =========================

class ArticleRequest(BaseModel):
    text: str

class AnalyzeRequest(BaseModel):
    text: str | None = ""
    link: str | None = ""

class RewriteRequest(BaseModel): 
    article_id: int           
    text: str

# =========================
# ANALYZE ARTICLE
# =========================

@app.post("/analyze")
def analyze_article(data: AnalyzeRequest):
    # Prefer link if present
    if data.link:
        title, text = fetch_article_from_link(data.link)
    else:
        text = data.text
        title = " ".join(text.strip().split("\n")[0].split()[:8])

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="No article content found")

    ai_result = analyze_text(text)

    article = Article(
        title=title,
        content=text,
        bias_score=ai_result["bias_score"],
        summary=ai_result["summary"],
        perspectives=ai_result["perspectives"],
        explanation=ai_result["explanation"],
        deep_analysis=ai_result.get("deep_analysis"),
        author_id=1
    )

    with Session(engine) as session:
        session.add(article)
        session.commit()
        session.refresh(article)

    return {
        "id": article.id,
        "title": article.title,
        "content": article.content,
        "bias_score": article.bias_score,
        "bias_label": ai_result.get("bias_label", "Unknown"),
        "summary": article.summary,
        "perspectives": article.perspectives,
        "explanation": article.explanation,
        "deep_analysis": article.deep_analysis,
    }

# =========================
#  REWRITE ARTICLE (NEW)
# =========================
@app.post("/rewrite")
def rewrite_article(data: RewriteRequest):
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="No article text provided")

    rewritten_text = rewrite_article_neutral(data.text)

    with Session(engine) as session:
        article = session.get(Article, data.article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")

        article.rewritten_text = rewritten_text
        article.updated_at = datetime.utcnow()
        session.add(article)
        session.commit()

    return {"rewritten_text": rewritten_text}

# =========================
# ARTICLES CRUD
# =========================

@app.get("/articles")
def get_articles():
    with Session(engine) as session:
        return session.exec(
            select(Article).order_by(Article.created_at.desc())
        ).all()

@app.get("/articles/{article_id}")
def get_article(article_id: int):
    with Session(engine) as session:
        article = session.get(Article, article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        return article

@app.put("/articles/{article_id}")
def update_article(article_id: int, data: ArticleRequest):
    with Session(engine) as session:
        article = session.get(Article, article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")

        article.content = data.text
        article.updated_at = datetime.utcnow()

        session.add(article)
        session.commit()
        session.refresh(article)

        return article

@app.delete("/articles/{article_id}")
def delete_article(article_id: int):
    with Session(engine) as session:
        article = session.get(Article, article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")

        session.delete(article)
        session.commit()

        return {"status": "deleted"}
# =========================
#  DOWNLOAD ARTICLE AS PDF
# =========================


@app.get("/articles/{article_id}/download_pdf")
def download_article_pdf(article_id: int):
    with Session(engine) as session:
        article = session.get(Article, article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")

    # Create PDF in memory
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer)

    # Title
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(50, 800, article.title)

    # Bias Score
    pdf.setFont("Helvetica", 12)
    pdf.drawString(50, 780, f"Bias Score: {article.bias_score}")

    # Summary
    y = 760
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(50, y, "Summary:")
    pdf.setFont("Helvetica", 12)
    y -= 20
    for line in article.summary.split("\n"):
        pdf.drawString(50, y, line)
        y -= 15
        if y < 50:
            pdf.showPage()
            y = 800

    # Content
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(50, y, "Content:")
    pdf.setFont("Helvetica", 12)
    y -= 20
    for line in article.content.split("\n"):
        pdf.drawString(50, y, line)
        y -= 15
        if y < 50:
            pdf.showPage()
            y = 800

    # Rewritten text if available
    if getattr(article, "rewritten_text", None):
        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(50, y, "Rewritten Text:")
        pdf.setFont("Helvetica", 12)
        y -= 20
        for line in article.rewritten_text.split("\n"):
            pdf.drawString(50, y, line)
            y -= 15
            if y < 50:
                pdf.showPage()
                y = 800

    pdf.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={article.title}.pdf"}
    )