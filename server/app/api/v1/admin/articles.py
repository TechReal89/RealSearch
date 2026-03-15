"""Admin API for article/content management."""
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_admin_user
from app.models.article import Article

router = APIRouter(prefix="/admin/articles", tags=["Admin Articles"])


class ArticleCreate(BaseModel):
    title: str
    content: str = ""
    excerpt: str | None = None
    thumbnail: str | None = None
    category: str = "guide"
    status: str = "draft"
    sort_order: int = 0
    meta_title: str | None = None
    meta_description: str | None = None
    is_featured: bool = False


class ArticleUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    excerpt: str | None = None
    thumbnail: str | None = None
    category: str | None = None
    status: str | None = None
    sort_order: int | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    is_featured: bool | None = None


def _slugify(text: str) -> str:
    """Generate URL-friendly slug from text."""
    # Remove Vietnamese diacritics mapping
    vietnamese_map = {
        'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
        'đ': 'd',
        'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
        'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
        'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
        'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
        'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
        'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
        'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
        'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
        'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    }
    slug = text.lower()
    for vn_char, ascii_char in vietnamese_map.items():
        slug = slug.replace(vn_char, ascii_char)
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug).strip('-')
    return slug


@router.get("")
async def list_articles(
    category: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    query = select(Article)
    count_query = select(func.count(Article.id))

    if category:
        query = query.where(Article.category == category)
        count_query = count_query.where(Article.category == category)
    if status:
        query = query.where(Article.status == status)
        count_query = count_query.where(Article.status == status)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(Article.sort_order.asc(), Article.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    articles = result.scalars().all()

    return {
        "articles": [_article_to_dict(a) for a in articles],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("")
async def create_article(
    data: ArticleCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_admin_user),
):
    slug = _slugify(data.title)
    # Ensure unique slug
    existing = await db.execute(select(Article).where(Article.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{int(datetime.now(timezone.utc).timestamp())}"

    article = Article(
        title=data.title,
        slug=slug,
        content=data.content,
        excerpt=data.excerpt,
        thumbnail=data.thumbnail,
        category=data.category,
        status=data.status,
        sort_order=data.sort_order,
        meta_title=data.meta_title,
        meta_description=data.meta_description,
        is_featured=data.is_featured,
        author_id=admin.id,
    )
    if data.status == "published":
        article.published_at = datetime.now(timezone.utc)

    db.add(article)
    await db.commit()
    await db.refresh(article)
    return _article_to_dict(article)


@router.get("/{article_id}")
async def get_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return _article_to_dict(article)


@router.put("/{article_id}")
async def update_article(
    article_id: int,
    data: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    update_data = data.model_dump(exclude_unset=True)

    if "title" in update_data:
        new_slug = _slugify(update_data["title"])
        existing = await db.execute(
            select(Article).where(Article.slug == new_slug, Article.id != article_id)
        )
        if existing.scalar_one_or_none():
            new_slug = f"{new_slug}-{int(datetime.now(timezone.utc).timestamp())}"
        article.slug = new_slug

    for key, value in update_data.items():
        setattr(article, key, value)

    if data.status == "published" and not article.published_at:
        article.published_at = datetime.now(timezone.utc)

    article.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(article)
    return _article_to_dict(article)


@router.delete("/{article_id}")
async def delete_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    await db.delete(article)
    await db.commit()
    return {"success": True}


def _article_to_dict(article: Article) -> dict:
    return {
        "id": article.id,
        "title": article.title,
        "slug": article.slug,
        "content": article.content,
        "excerpt": article.excerpt,
        "thumbnail": article.thumbnail,
        "category": article.category,
        "status": article.status,
        "author_id": article.author_id,
        "sort_order": article.sort_order,
        "view_count": article.view_count,
        "meta_title": article.meta_title,
        "meta_description": article.meta_description,
        "is_featured": article.is_featured,
        "published_at": article.published_at.isoformat() if article.published_at else None,
        "created_at": article.created_at.isoformat() if article.created_at else None,
        "updated_at": article.updated_at.isoformat() if article.updated_at else None,
    }
