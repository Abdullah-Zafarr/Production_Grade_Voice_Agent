"""
loader.py — Advanced knowledge loader.
Parses JSON, Markdown (.md), and Text (.txt) files from data/ and docs/.
"""
import os
import json
import logging
from typing import List, Dict
from agent.knowledge.store import knowledge_store

logger = logging.getLogger("knowledge-loader")

async def ingest_knowledge_base():
    """
    Scans both 'data' and 'docs' directories for knowledge sources.
    Parses JSON (question/answer format) and plain text / markdown files.
    """
    base_dir = os.path.dirname(__file__)
    data_sources = [
        os.path.join(base_dir, "data"),
        os.path.join(base_dir, "docs")
    ]
    
    # Ensure directories exist
    for source in data_sources:
        os.makedirs(source, exist_ok=True)
    
    chunks = []
    
    # Process files
    for source_dir in data_sources:
        if not os.path.exists(source_dir):
            continue
            
        for filename in os.listdir(source_dir):
            file_path = os.path.join(source_dir, filename)
            logger.debug(f"Processing knowledge source: {filename}")
            
            # 1. Process JSON
            if filename.endswith(".json"):
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if isinstance(data, list):
                            for item in data:
                                if "question" in item and "answer" in item:
                                    chunks.append(f"Q: {item['question']}\nA: {item['answer']}")
                                elif "content" in item:
                                    chunks.append(item["content"])
                except Exception as e:
                    logger.error(f"Failed to parse JSON {filename}: {e}")
            
            # 2. Process MD / TXT
            elif filename.endswith((".md", ".txt")):
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read().strip()
                        if content:
                            # Split large documents into chunks of ~1000 characters with some overlap
                            text_chunks = [content[i:i+1000] for i in range(0, len(content), 800)]
                            chunks.extend(text_chunks)
                except Exception as e:
                    logger.error(f"Failed to read text file {filename}: {e}")
            
            # 3. Placeholder for PDF/DOCX
            elif filename.endswith((".pdf", ".docx")):
                logger.warning(f"File format '{filename}' is detected but not yet supported for direct ingestion.")
                    
    if not chunks:
        logger.warning("Search failed: No valid knowledge chunks were found in the source directories.")
        return
        
    logger.info(f"Generating embeddings for {len(chunks)} chunks...")
    
    # Prepare chunk objects for the store
    chunk_objs = [{"content": c} for c in chunks]
    embeddings_matrix = []
    
    for i, chunk_obj in enumerate(chunk_objs):
        emb = await knowledge_store.get_embedding(chunk_obj["content"])
        if emb:
             embeddings_matrix.append(emb)
        else:
             logger.warning(f"Failed to generate embedding for chunk {i}. Using fallback.")
             embeddings_matrix.append([0.0]*1536)
             
    knowledge_store.set_data(chunk_objs, embeddings_matrix)
    logger.info(f"Knowledge base successfully updated with {len(chunks)} searchable segments.")
