class CacheService:
    def __init__(self):
        self.cache = {}
    
    async def initialize(self):
        pass
    
    async def close(self):
        pass

cache_service = CacheService()