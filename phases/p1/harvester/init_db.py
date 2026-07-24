"""Initialize database tables."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.models import JobModel, Base

async def create_tables():
    """Create all tables in the database."""
    engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost:5432/jobplatform", echo=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("Tables created successfully!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_tables())
