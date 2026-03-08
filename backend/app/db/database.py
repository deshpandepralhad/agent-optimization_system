import aiosqlite
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Async database manager with connection pooling"""
    
    def __init__(self, db_path: str = "agent_system.db"):
        self.db_path = db_path
        self._connection_pool: asyncio.Queue = asyncio.Queue(maxsize=10)
        self._initialized = False
        
    async def initialize(self):
        """Initialize database and connection pool"""
        if self._initialized:
            return
            
        # Ensure directory exists
        db_path_obj = Path(self.db_path)
        db_path_obj.parent.mkdir(parents=True, exist_ok=True)
        
        # Create tables using a direct connection (not from pool)
        async with aiosqlite.connect(self.db_path) as conn:
            conn.row_factory = aiosqlite.Row
            await conn.executescript("""
                PRAGMA foreign_keys = ON;
                PRAGMA journal_mode = WAL;
                
                CREATE TABLE IF NOT EXISTS agent_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    variant TEXT NOT NULL,
                    status TEXT NOT NULL,
                    latency_ms REAL NOT NULL,
                    input_text TEXT,
                    output_text TEXT,
                    task_type TEXT NOT NULL,
                    metadata TEXT,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_events_timestamp 
                    ON agent_events(timestamp DESC);
                CREATE INDEX IF NOT EXISTS idx_events_variant 
                    ON agent_events(variant);
                CREATE INDEX IF NOT EXISTS idx_events_status 
                    ON agent_events(status);
                CREATE INDEX IF NOT EXISTS idx_events_task_type 
                    ON agent_events(task_type);
                
                CREATE TABLE IF NOT EXISTS optimization_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    previous_variant TEXT,
                    new_variant TEXT,
                    reason TEXT NOT NULL,
                    confidence REAL,
                    avg_latency_ms REAL,
                    error_rate REAL,
                    metadata TEXT,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_optimization_timestamp 
                    ON optimization_history(timestamp DESC);
                
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL,
                    metric_value REAL,
                    threshold REAL,
                    resolved BOOLEAN DEFAULT FALSE,
                    resolved_at DATETIME,
                    metadata TEXT
                );
                
                CREATE INDEX IF NOT EXISTS idx_alerts_resolved 
                    ON alerts(resolved, timestamp DESC);
            """)
            await conn.commit()
            
        # Initialize connection pool with separate connections
        for _ in range(5):
            conn = await aiosqlite.connect(self.db_path)
            conn.row_factory = aiosqlite.Row
            await self._connection_pool.put(conn)
            
        self._initialized = True
        logger.info(f"Database initialized successfully at {self.db_path}")
        
    @asynccontextmanager
    async def get_connection(self) -> AsyncGenerator[aiosqlite.Connection, None]:
        """Get a connection from the pool"""
        # If not initialized, initialize first (but this shouldn't happen with proper startup)
        if not self._initialized:
            await self.initialize()
            
        conn = await self._connection_pool.get()
        try:
            yield conn
        finally:
            await self._connection_pool.put(conn)
            
    async def close(self):
        """Close all connections in the pool"""
        while not self._connection_pool.empty():
            try:
                conn = await self._connection_pool.get()
                await conn.close()
            except:
                pass
        self._initialized = False
        logger.info("Database connections closed")

# Singleton instance
db_manager = DatabaseManager()