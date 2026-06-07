"""
store.py — In-memory vector store using numpy for fast cosine similarity.
"""
import logging
from typing import List, Dict
import numpy as np
from openai import AsyncOpenAI
from agent.config import settings

logger = logging.getLogger("knowledge-store")

class KnowledgeStore:
    """Simple in-memory vector database for clinic knowledge Retrieval-Augmented Generation (RAG)."""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.embeddings: np.ndarray = np.array([])
        self.chunks: List[Dict] = []
        self._is_loaded = False
        
    async def get_embedding(self, text: str) -> List[float]:
        """Generates a vector embedding using OpenAI's text-embedding-3-small model."""
        try:
            response = await self.client.embeddings.create(
                input=text,
                model="text-embedding-3-small"
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return []

    def set_data(self, chunks: List[Dict], embeddings_matrix: List[List[float]]):
        """Injects chunks and their pre-computed embeddings into the store."""
        self.chunks = chunks
        self.embeddings = np.array(embeddings_matrix)
        self._is_loaded = True
        logger.info(f"Knowledge store updated: {len(self.chunks)} chunks active.")

    def clear(self):
        """Wipes the current knowledge base from memory."""
        self.chunks = []
        self.embeddings = np.array([])
        self._is_loaded = False
        logger.info("Knowledge store cleared.")

    async def search(self, query: str, top_k: int = 3) -> str:
        """Performs a cosine similarity search and returns the top relevant chunks."""
        if not self._is_loaded or len(self.chunks) == 0:
            return "Knowledge base is currently empty or loading."
            
        query_embedding = await self.get_embedding(query)
        if not query_embedding:
            return "Unable to process query at this time."
            
        q_vec = np.array(query_embedding)
        
        # Matrix multiplication for fast cosine similarity scores
        dot_products = np.dot(self.embeddings, q_vec)
        norms = np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(q_vec)
        
        # Handle edge cases (zero vectors)
        norms[norms == 0] = 1e-10
        similarities = dot_products / norms
        
        # Extract indices of top scores
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        results = []
        for idx in top_indices:
            if similarities[idx] > 0.4: # Similarity threshold (40%)
                results.append(self.chunks[idx].get("content", ""))
                
        if not results:
            return "No relevant clinic documentation found for this query."
            
        return "\n\n".join(results)

# Global singleton instance
knowledge_store = KnowledgeStore()
