"""Public API for articles - guides and news."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.article import Article

router = APIRouter(prefix="/api/v1/articles", tags=["Articles"])


@router.get("")
async def list_published_articles(
    category: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """List published articles (public)."""
    query = select(Article).where(Article.status == "published")
    count_query = select(func.count(Article.id)).where(Article.status == "published")

    if category:
        query = query.where(Article.category == category)
        count_query = count_query.where(Article.category == category)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(Article.sort_order.asc(), Article.published_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    articles = result.scalars().all()

    return {
        "articles": [
            {
                "id": a.id,
                "title": a.title,
                "slug": a.slug,
                "excerpt": a.excerpt,
                "thumbnail": a.thumbnail,
                "category": a.category,
                "is_featured": a.is_featured,
                "view_count": a.view_count,
                "published_at": a.published_at.isoformat() if a.published_at else None,
            }
            for a in articles
        ],
        "total": total,
    }


@router.get("/{slug}")
async def get_article_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get single published article by slug (public)."""
    result = await db.execute(
        select(Article).where(Article.slug == slug, Article.status == "published")
    )
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Increment view count
    article.view_count += 1
    await db.commit()

    return {
        "id": article.id,
        "title": article.title,
        "slug": article.slug,
        "content": article.content,
        "excerpt": article.excerpt,
        "thumbnail": article.thumbnail,
        "category": article.category,
        "is_featured": article.is_featured,
        "view_count": article.view_count,
        "meta_title": article.meta_title,
        "meta_description": article.meta_description,
        "published_at": article.published_at.isoformat() if article.published_at else None,
    }
